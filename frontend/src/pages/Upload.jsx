import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaCar,
  FaPlay,
  FaStop,
  FaPlus,
  FaCheck,
  FaTrash,
  FaEnvelope,
} from "react-icons/fa";
import { ImSpinner8 } from "react-icons/im";
import {toast , Toaster} from "react-hot-toast"
const Upload = () => {
  const [stats, setStats] = useState({
    scanned: 0,
    valid: 0,
    expired: 0,
    unknown: 0,
  });

  const [vehicleInfo, setVehicleInfo] = useState({
    plateNumber: "",
    insuranceStatus: "",
    statusClass: "",
    email: "",
    number:"",
    
  });

  const [formData, setFormData] = useState({
    plate: "",
    status: "Unknown",
    email: "",
    phone: "",
    name: "",
  });

  const [cars, setCars] = useState([]);
  const [expiredVehicles, setExpiredVehicles] = useState([]);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingExpired, setIsLoadingExpired] = useState(false);
  const [carsLoaded, setCarsLoaded] = useState(false);
  const [matchedcar, setMatchedCar] = useState();
  const [matchedPlate, setMatchedPlate] = useState();
  const [showButton, setShowButton] = useState(false);
  const [showUnknownButton, setShowUnknownButton] = useState(false);
  const [loading , setLoading] = useState(false);
  const [loadingUnknown, setLoadingUnknown] = useState(false);

  // Fetch data periodically
  useEffect(() => {
    const initializeData = async () => {
      await fetchAllCars();
      await fetchExpiredVehicles();
      setCarsLoaded(true);
    };
    initializeData();

    const interval = setInterval(() => {
      if (carsLoaded) {
        fetchPlateData();
      }
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [carsLoaded]);

  const fetchPlateData = async () => {
    try {
      const { data } = await axios.get("http://127.0.0.1:8000/plates");

      if (data) {
        const plate = data?.last_plate?.plate || "-";
        const status = data?.last_plate?.status;

        // Find matching car in our database
        const matchedCar = cars.find((car) => car.license === plate);

        const email = matchedCar ? matchedCar.email : "-";
        const number = matchedCar ? matchedCar.number:"-"
        const verifiedStatus = matchedCar ? matchedCar.status : "Unknown";
        const statusClass = getStatusClass(verifiedStatus);
        const name = matchedCar ? matchedCar?.name:"-"

        setVehicleInfo({
          plateNumber: plate,
          insuranceStatus: verifiedStatus,
          statusClass,
          email,
          number,
          name
        });

        // Store matched car for later use when sending notification
        setMatchedCar(matchedCar);

        // If status is expired, show expiry notification button
        if (matchedCar && verifiedStatus === "Expired" && matchedCar.email) {
          setShowButton(true);
          setShowUnknownButton(false);
        } 
        // If status is unknown, show unknown status notification button
        else if (matchedCar && verifiedStatus === "Unknown" && matchedCar.email) {
          setShowUnknownButton(true);
          setShowButton(false);
        } 
        else {
          setShowButton(false);
          setShowUnknownButton(false);
        }
      }

      if (data.stats) {
        setStats({
          scanned: data.stats.scanned || 0,
          valid: data.stats.valid || 0,
          expired: data.stats.expired || 0,
          unknown: data.stats.unknown || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching plate data:", error);
    }
  };

  const sendUnknownStatusNotification = async (email, plate, number) => {
    try {
      setLoadingUnknown(true);
      
      // Send email notification for Unknown status
      const emailResponse = await axios.post("http://localhost:5000/send-mail", {
        email,
        plate,
        status: "Unknown",
      });

      // Check if email was sent successfully
      if (!emailResponse.data.success) {
        setLoadingUnknown(false);
        toast.error("Failed to send email notification");
        return;
      }

      // Send SMS notification for Unknown status
      const smsResponse = await axios.post("http://localhost:5000/send-sms", {
        number,
        status: "Unknown",
        plate,
      });

      // Check if SMS was sent successfully
      if (!smsResponse.data.success) {
        setLoadingUnknown(false);
        toast.error("Failed to send SMS notification");
        return;
      }

      toast.success(`Status update notification sent successfully to ${email}`);
      setLoadingUnknown(false);
      setShowUnknownButton(false);
    } catch (error) {
      console.error("Error sending unknown status notification:", error);
      toast.error("Failed to send notifications");
      setLoadingUnknown(false);
    }
  };

  const sendExpiryNotification = async (email, plate, number, name) => {
    try {
      setLoading(true);
      
      // Find the matched car from Registered Vehicles to copy all data
      const matchedCarFromDB = matchedcar || cars.find((car) => car.license === plate);
      
      if (!matchedCarFromDB) {
        setLoading(false);
        toast.error("Vehicle not found in registered vehicles");
        return;
      }

      // Send email notification
      const emailResponse = await axios.post("http://localhost:5000/send-mail", {
        email,
        plate,
        status: "Expired",
      });

      // Check if email was sent successfully
      if (!emailResponse.data.success) {
        setLoading(false);
        toast.error("Failed to send email notification");
        return;
      }

      // Send SMS notification
      const smsResponse = await axios.post("http://localhost:5000/send-sms", {
        number,
        status: "Expired",
        plate,
      });

      // Check if SMS was sent successfully
      if (!smsResponse.data.success) {
        setLoading(false);
        toast.error("Failed to send SMS notification");
        return;
      }

      // Both notifications sent successfully, now copy all data from Registered Vehicles to Verified Vehicles
      try {
        const storeResponse = await axios.post("http://localhost:5000/expired-vehicle/add", {
          license: matchedCarFromDB.license || plate,
          status: matchedCarFromDB.status || "Expired",
          email: matchedCarFromDB.email || email,
          number: matchedCarFromDB.number || number,
          name: matchedCarFromDB.name || name,
        });

        if (storeResponse.data.success) {
          toast.success(`Expiry notification sent successfully to ${email}. Vehicle data copied to Verified Vehicles.`);
          await fetchExpiredVehicles(); // Refresh expired vehicles list
        }
      } catch (storeError) {
        console.error("Error storing expired vehicle:", storeError);
        toast.error("Notifications sent but failed to store vehicle record");
      }

      setLoading(false);
      setShowButton(false);
    } catch (error) {
      console.error("Error sending expiry notification:", error);
      toast.error("Failed to send notifications");
      setLoading(false);
    }
  };

  const fetchAllCars = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/car/get-all");
      setCars(response.data.cars);
    } catch (error) {
      console.error("Error fetching cars:", error);
     
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExpiredVehicles = async () => {
    setIsLoadingExpired(true);
    try {
      const response = await axios.get("http://localhost:5000/expired-vehicle/get-all");
      setExpiredVehicles(response.data.expiredVehicles);
    } catch (error) {
      console.error("Error fetching expired vehicles:", error);
    } finally {
      setIsLoadingExpired(false);
    }
  };

  const deleteExpiredVehicle = async (id) => {
    if (window.confirm("Are you sure you want to delete this verified vehicle?")) {
      try {
        const response = await axios.post(`http://localhost:5000/expired-vehicle/delete`, {
          id,
        });
        if (response.data.success) {
          showMessage("Verified vehicle deleted successfully", "success");
          fetchExpiredVehicles(); // Refresh expired vehicles list
        }
      } catch (error) {
        showMessage(
          `Error: ${error.response?.data?.message || error.message}`,
          "error"
        );
      }
    }
  };
  const getStatusClass = (status) => {
    switch (status) {
      case "Valid":
        return "text-green-600";
      case "Expired":
        return "text-red-600";
      default:
        return "text-yellow-600";
    }
  };

  const handleStreamAction = async (action) => {
    try {
      const endpoint =
        action === "start"
          ? "http://127.0.0.1:8000/start"
          : "http://127.0.0.1:8000/stop";

      const { data } = await axios.post(endpoint);
      console.log(data);
      setIsStreaming(action === "start");

      showMessage(
        `Stream ${action === "start" ? "started" : "stopped"} successfully`,
        "success"
      );
    } catch (error) {
      console.error(`Error ${action}ing stream:`, error);
      showMessage(`Failed to ${action} stream: ${error.message}`, "error");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addRecord = async () => {
    if (!formData.plate.trim()) {
      showMessage("Please enter a plate number", "error");
      return;
    }

    if (!formData.email.trim()) {
      showMessage("Please enter an email address", "error");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/car/add", {
        license: formData.plate.trim().toUpperCase(),
        status: formData.status,
        email: formData.email.trim(),
        number:formData.phone,
        name:formData.name
      });

      if (response.data.success) {
        showMessage(
          `Record for ${formData.plate} added successfully`,
          "success"
        );
        setFormData({
          plate: "",
          status: "Unknown",
          email: "",
          phone: "",
          name: "",
        });
        fetchAllCars(); // Refresh cars list
      } else {
        showMessage(response.data.message || "Failed to add record", "error");
      }
    } catch (error) {
      showMessage(
        `Error: ${error.response?.data?.message || error.message}`,
        "error"
      );
    }
  };

  const deleteCar = async (id) => {
    if (window.confirm("Are you sure you want to delete this car?")) {
      try {
        const response = await axios.post(`http://localhost:5000/car/delete`, {
          id,
        });
        if (response.data.success) {
          showMessage("Car deleted successfully", "success");
          fetchAllCars(); // Refresh cars list
        }
      } catch (error) {
        showMessage(
          `Error: ${error.response?.data?.message || error.message}`,
          "error"
        );
      }
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Toaster position="top-center" reverseOrder={false} />
      <header className="bg-blue-900 text-white p-4 text-2xl font-bold">
        <div className="container mx-auto flex items-center">
          <FaCar className="mr-2" />
          ANPR System with Insurance Verification
        </div>
      </header>

      {/* Stats Cards */}
      <div className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Scanned" value={stats.scanned} />
        <StatCard
          title="Valid"
          value={stats.valid}
          color="bg-green-100 text-green-800"
        />
        <StatCard
          title="Expired"
          value={stats.expired}
          color="bg-red-100 text-red-800"
        />
        <StatCard
          title="Unknown"
          value={stats.unknown}
          color="bg-yellow-100 text-yellow-800"
        />
      </div>

      {/* Controls */}
      <div className="container mx-auto p-4 text-center">
        <button
          onClick={() => handleStreamAction("start")}
          className={`px-6 py-2 rounded-md mr-4 ${
            isStreaming ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
          disabled={isStreaming}
        >
          <FaPlay className="inline mr-2" />
          Start Stream
        </button>
        <button
          onClick={() => handleStreamAction("stop")}
          className={`px-6 py-2 rounded-md ${
            !isStreaming ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"
          } text-white`}
          disabled={!isStreaming}
        >
          <FaStop className="inline mr-2" />
          Stop Stream
        </button>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Video Feed */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-xl font-semibold mb-4">Video Feed</h3>
          <img
            src={isStreaming ? "http://127.0.0.1:8000/video" : ""}
            alt="Video Stream"
            className={`w-full border-2 border-gray-200 rounded-lg ${
              isStreaming ? "" : "hidden"
            }`}
          />
          {!isStreaming && (
            <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded-lg">
              <p className="text-gray-500">Stream is not active</p>
            </div>
          )}
        </div>

        {/* Vehicle Info */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-xl font-semibold mb-4">Vehicle Information</h3>
          <div className="space-y-3">
            <div className="text-lg">
              <strong>Plate Number:</strong> {vehicleInfo.plateNumber}
            </div>
            <div className="text-lg">
              <strong>Insurance Status:</strong>
              <span className={`ml-2 ${vehicleInfo.statusClass}`}>
                {vehicleInfo.insuranceStatus}
              </span>
            </div>
            <div className="text-lg">
              <strong>Name:</strong> {vehicleInfo.name}
            </div>
            <div className="text-lg">
              <strong>Registered Email:</strong> {vehicleInfo.email}
            </div>
            <div className="text-lg">
              <strong>Registered Contact:</strong> {vehicleInfo.number}
            </div>
            {showButton ? (
              <button
                onClick={() =>
                  sendExpiryNotification(
                    vehicleInfo.email,
                    vehicleInfo.plateNumber,
                    vehicleInfo.number,
                    vehicleInfo.name
                  )
                }
                className="flex items-center text-blue-600 hover:text-blue-800 mt-2"
              >
                {loading ? null : <FaEnvelope className="mr-2" />}

                {loading ? (
                  <ImSpinner8 className="animate-spin" size={25} />
                ) : (
                  "Send Expiry Notification"
                )}
              </button>
            ) : null}
            {showUnknownButton ? (
              <button
                onClick={() =>
                  sendUnknownStatusNotification(
                    vehicleInfo.email,
                    vehicleInfo.plateNumber,
                    vehicleInfo.number
                  )
                }
                className="flex items-center text-yellow-600 hover:text-yellow-800 mt-2"
              >
                {loadingUnknown ? null : <FaEnvelope className="mr-2" />}

                {loadingUnknown ? (
                  <ImSpinner8 className="animate-spin" size={25} />
                ) : (
                  "Send Status Update Notification"
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Add Record Form */}
      <div className="container mx-auto p-4 mt-6">
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold mb-4 flex items-center">
            <FaPlus className="mr-2 text-blue-600" />
            Add Insurance Record
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="plate" className="block font-medium mb-1">
                License Plate Number:
              </label>
              <input
                type="text"
                id="plate"
                name="plate"
                value={formData.plate}
                onChange={handleInputChange}
                placeholder="Enter plate number"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block font-medium mb-1">
                Name:
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter owner's name"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block font-medium mb-1">
                Email Address:
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter owner's email"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="text" className="block font-medium mb-1">
                Contact Number:
              </label>
              <input
                type="text"
                id="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Enter owner's contact "
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="status" className="block font-medium mb-1">
                Insurance Status:
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Valid">Valid</option>
                <option value="Expired">Expired</option>                
                <option value="Unknown" selected>Unknown</option>
              </select>
            </div>

            <button
              onClick={addRecord}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium transition flex items-center justify-center"
            >
              <FaCheck className="mr-2" />
              Add Record
            </button>

            {message.text && (
              <div
                className={`p-3 rounded-md ${
                  message.type === "success"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {message.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cars Table */}
      <div className="container mx-auto p-4 mt-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <FaCar className="mr-2 text-blue-600" />
              Registered Vehicles
            </h3>

            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : cars.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No vehicles found. Add a vehicle to see it here.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        License Plate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cars.map((car) => (
                      <tr key={car._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {car.license}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {car.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {car.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {car.number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              car.status === "Valid"
                                ? "bg-green-100 text-green-800"
                                : car.status === "Expired"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {car.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(car.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => deleteCar(car._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verified Vehicles Table */}
      <div className="container mx-auto p-4 mt-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <FaCheck className="mr-2 text-green-600" />
              Verified Vehicles
            </h3>

            {isLoadingExpired ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
              </div>
            ) : expiredVehicles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No verified vehicles found. Expired vehicles will appear here after notifications are sent successfully.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        License Plate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notification Sent At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expiredVehicles.map((vehicle) => (
                      <tr key={vehicle._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {vehicle.license}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {vehicle.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vehicle.number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            {vehicle.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(vehicle.notificationSentAt || vehicle.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => deleteExpiredVehicle(vehicle._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// StatCard component remains the same
const StatCard = ({ title, value, color = "bg-blue-100 text-blue-800" }) => (
  <div className={`p-4 rounded-lg shadow ${color}`}>
    <h2 className="text-3xl font-bold text-center">{value}</h2>
    <p className="text-center mt-1">{title}</p>
  </div>
);

export default Upload;
