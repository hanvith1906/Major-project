import cv2
from fastapi import FastAPI
from starlette.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import threading
import sqlite3
import io
import base64
from pydantic import BaseModel
import numpy as np
from PIL import Image
from ultralytics import YOLO
import google.generativeai as genai
import time
import torch
from queue import Queue
import concurrent.futures

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Your frontend's URL
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

app.mount("/static", StaticFiles(directory="static"), name="static")
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"Using device: {device}")

model = YOLO("best.pt")
cap = cv2.VideoCapture(0)
if not cap.isOpened():
    raise RuntimeError("Could not start camera.")

frame_count = 0
OCR_INTERVAL = 10
streaming = False
stream_lock = threading.Lock()

plate_queue = Queue(maxsize=10)
executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)

latest_detections = []
last_update_time = 0

detected_plates = set()
stats = {
    "scanned": 0,
    "valid": 0,
    "expired": 0,
    "unknown": 0
}
last_plate_data = {
    "plate": "",
    "status": ""
}

gemini_model = None

def initialize_gemini():
    global gemini_model
    genai.configure(api_key="AIzaSyBvh-krDZmV6cVUR6i20UoYTpDLbXOLXhc")
    gemini_model = genai.GenerativeModel('gemini-2.5-flash-lite')
    return gemini_model

def encode_image_to_base64(pil_image):
    buffered = io.BytesIO()
    pil_image.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def extract_plate_number(image_pil):
    global gemini_model
    if gemini_model is None:
        gemini_model = initialize_gemini()
        
    prompt = """
You are given an image of a vehicle license plate. Extract only the alphanumeric license plate number as a plain string. 
Do not include any symbols, whitespace, or special characters. Do not wrap in JSON, only return the string. If unreadable, return "Unknown".
"""
    img_base64 = encode_image_to_base64(image_pil)
    parts = [
        {"text": prompt},
        {"inline_data": {"mime_type": "image/png", "data": img_base64}}
    ]
    try:
        response = gemini_model.generate_content(parts)
        plate_raw = response.text.strip()
        return ''.join(filter(str.isalnum, plate_raw.upper()))
    except Exception as e:
        print(f"Gemini API error: {e}")
        return "Unknown"

def init_db():
    conn = sqlite3.connect("insurance.db")
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS insurance (
            plate TEXT PRIMARY KEY,
            status TEXT
        )
    ''')
    conn.commit()
    conn.close()

def get_insurance_status(plate_number):
    conn = sqlite3.connect("insurance.db")
    cur = conn.cursor()
    cur.execute("SELECT status FROM insurance WHERE plate = ?", (plate_number,))
    result = cur.fetchone()
    conn.close()
    return result[0] if result else "Unknown"

def process_plates_worker():
    global latest_detections, last_update_time, stats, last_plate_data, detected_plates
    
    while True:
        try:
            plate_data = plate_queue.get()
            if plate_data is None:
                break
                
            pil_image = plate_data
            
            plate_number = extract_plate_number(pil_image)
            if not plate_number or plate_number == "Unknown":
                plate_queue.task_done()
                continue
                
            status = get_insurance_status(plate_number)
            
            with stream_lock:
                last_plate_data = {"plate": plate_number, "status": status}
                
                if plate_number not in detected_plates:
                    detected_plates.add(plate_number)
                    stats["scanned"] += 1
                    if status == "Valid":
                        stats["valid"] += 1
                    elif status == "Expired":
                        stats["expired"] += 1
                    else:
                        stats["unknown"] += 1
                        
                latest_detections = [{"plate": plate_number, "status": status}]
                last_update_time = time.time()
                
            plate_queue.task_done()
        except Exception as e:
            print(f"Error in plate processing worker: {e}")
            plate_queue.task_done()

def start_background_workers():
    for _ in range(2):
        worker_thread = threading.Thread(target=process_plates_worker, daemon=True)
        worker_thread.start()

init_db()
initialize_gemini()
start_background_workers()

def generate_frames():
    global frame_count
    
    while True:
        with stream_lock:
            if not streaming:
                time.sleep(0.1)
                continue

        success, frame = cap.read()
        if not success:
            break

        frame_count += 1
        display_frame = frame.copy()
        
        results = model(frame, conf=0.5, verbose=False, device=device)
        boxes = results[0].boxes
        names = results[0].names
        
        for box in boxes:
            cls_id = int(box.cls[0])
            cls_name = names[cls_id]
            if cls_name == "LicensePlate":
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                
                cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                
                if frame_count % OCR_INTERVAL == 0:
                    plate_crop = frame[y1:y2, x1:x2]
                    try:
                        pil_image = Image.fromarray(cv2.cvtColor(plate_crop, cv2.COLOR_BGR2RGB))
                        if not plate_queue.full():
                            plate_queue.put(pil_image)
                    except Exception as e:
                        print(f"Error processing frame: {e}")

        ret, buffer = cv2.imencode('.jpg', display_frame)
        if not ret:
            continue

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        
class InsuranceRecord(BaseModel):
    plate: str
    status: str

@app.post("/add_record")
def add_record(record: InsuranceRecord):
    conn = sqlite3.connect("insurance.db")
    cur = conn.cursor()

    try:
        cur.execute("INSERT OR REPLACE INTO insurance (plate, status) VALUES (?, ?)", (record.plate, record.status))
        conn.commit()
        return {"status": "Record added successfully", "plate": record.plate, "insurance_status": record.status}
    except sqlite3.Error as e:
        return {"status": "Failed to add record", "error": str(e)}
    finally:
        conn.close()

@app.get("/video")
def video_feed():
    return StreamingResponse(generate_frames(), media_type='multipart/x-mixed-replace; boundary=frame')

@app.get("/plates")
def get_latest_detections():
    return JSONResponse({
        "last_plate": last_plate_data,
        "stats": stats
    })

@app.post("/start")
def start_stream():
    global streaming
    with stream_lock:
        streaming = True
    return {"status": "streaming started"}

@app.post("/stop")
def stop_stream():
    global streaming
    with stream_lock:
        streaming = False
    return {"status": "streaming stopped"}

@app.on_event("shutdown")
def shutdown_event():
    for _ in range(2):
        plate_queue.put(None)
    
    plate_queue.join()
    executor.shutdown()
    cap.release()