const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const carRoutes = require("./routes/carRoutes");
const expiredVehicleRoutes = require("./routes/expiredVehicleRoutes");
const nodemailer = require("nodemailer");

const twilio = require("twilio");
connectDB();
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/car", carRoutes);
app.use("/expired-vehicle", expiredVehicleRoutes);

const accountSid = "ACd7cd8f22d16114d58b57685a51c30af2"; // Replace with your Twilio Account SID
const authToken = "c28e107357f1072676c7884eade117c5"; // Replace with your Twilio Auth Token
const twilioPhoneNumber = "+18326621277"; // Replace with your Twilio phone number
const client = twilio(accountSid, authToken);

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "anpr6363@gmail.com ",
    pass: "kqiezwizhxeovelk",
  },
});

// Professional HTML email template
const generateEmailTemplate = (plate, status) => {
  const statusLower = status.toLowerCase();
  const statusColor =
    statusLower === "approved" ? "#4CAF50" : statusLower === "unknown" ? "#FF9800" : "#F44336";
  const fineAmount = statusLower === "approved" ? "0" : "5,000";

  // Handle Unknown status message
  if (statusLower === "unknown") {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #2c3e50; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">ANPR Vehicle Registration</h1>
      </div>
      
      <div style="padding: 20px;">
        <h2 style="color: #2c3e50;">Vehicle Registration Update Required</h2>
        
        <p>Dear Vehicle Owner,</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid ${statusColor}; margin: 15px 0;">
          <p><strong>License Plate Number:</strong> ${plate}</p>
          <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status}</span></p>
        </div>
        
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Your vehicle (${plate}) Insurance status is not updated. Kindly update it as soon as possible.
        </p>
        
        <p>Please contact our support team to update your vehicle insurance status to avoid any inconvenience.</p>
        
        <p>Best regards,</p>
        <p><strong>The ANPR Team</strong></p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #777;">
        <p>© ${new Date().getFullYear()} ANPR. All rights reserved.</p>
        <p>This is an automated message - please do not reply directly to this email.</p>
      </div>
    </div>
  `;
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #2c3e50; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">ANPR Vehicle Registration</h1>
      </div>
      
      <div style="padding: 20px;">
        <h2 style="color: #2c3e50;">Vehicle Registration Update</h2>
        
        <p>Dear Vehicle Owner,</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid ${statusColor}; margin: 15px 0;">
          <p><strong>License Plate Number:</strong> ${plate}</p>
          <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${status}</span></p>
          ${
            statusLower !== "approved"
              ? `<p><strong>Fine Amount:</strong> ₹${fineAmount}</p>`
              : ""
          }
        </div>
        
        ${
          statusLower !== "approved"
            ? `
        <p>Your vehicle registration has been marked as non-compliant. Please settle the fine amount at your earliest convenience to avoid further penalties.</p>
        <p>If you believe this is an error, please contact our support team immediately.</p>
        `
            : `
        <p>Your vehicle registration has been successfully processed and approved. Thank you for your compliance with our regulations.</p>
        `
        }
        
        <p>Best regards,</p>
        <p><strong>The ANPR Team</strong></p>
      </div>
      
      <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #777;">
        <p>© ${new Date().getFullYear()} ANPR. All rights reserved.</p>
        <p>This is an automated message - please do not reply directly to this email.</p>
      </div>
    </div>
  `;
};

// Route to send status email
app.post("/send-mail", async (req, res) => {
  const { email, status, plate } = req.body;

  // Input validation
  if (!email || !status || !plate) {
    return res.status(400).json({
      success: false,
      error: "Email, status, and license plate are all required fields",
    });
  }

  // Prepare email content
  const mailOptions = {
    from: '"ANPR Admin" <anpr6363@gmail.com>',
    to: email,
    subject: `Vehicle Registration Status: ${status}`,
    html: generateEmailTemplate(plate, status),
    text: status.toLowerCase() === "unknown"
      ? `Your vehicle (${plate}) Insurance status is not updated. Kindly update it as soon as possible.`
      : `Your vehicle with license number ${plate} is ${status}. ${
          status.toLowerCase() !== "approved"
            ? "You have been fined ₹5,000 for non-compliance."
            : "Your registration has been approved."
        }`,
  };

  try {
    await transporter.sendMail(mailOptions);

    // Log successful email delivery
    console.log(`Status email sent to ${email} for vehicle ${plate}`);

    res.status(200).json({
      success: true,
      message: "Status notification sent successfully",
      data: {
        recipient: email,
        vehiclePlate: plate,
        status: status,
      },
    });
  } catch (error) {
    console.error("Email delivery failed:", error);

    res.status(500).json({
      success: false,
      error: "Failed to send status notification",
      details: error.message,
    });
  }
});

const validateE164 = (phoneNumber) => {
  const e164Regex = /^\+?[1-9]\d{1,14}$/; // Regex to validate E.164 format
  return e164Regex.test(phoneNumber);
};
app.post("/send-sms", async (req, res) => {
  const { number, status, plate } = req.body;
  console.log(req.body);

  // Input validation
  if (!number || !status || !plate) {
    return res.status(400).json({
      success: false,
      error: "Phone number, status, and license plate are all required fields",
    });
  }

  // Validate phone number format (E.164)
  if (!validateE164(number)) {
    return res.status(400).json({
      success: false,
      error:
        "Invalid phone number format. Please use E.164 format (e.g., +919876543210)",
    });
  }

  // Generate professional SMS message
  const generateSMSMessage = (plate, status) => {
    const statusLower = status.toLowerCase();
    
    // Handle Unknown status
    if (statusLower === "unknown") {
      return (
        `ANPR Vehicle Update\n\n` +
        `⚠️ *${plate.toUpperCase()}* - ${status.toUpperCase()}\n\n` +
        `Your vehicle (${plate}) Insurance status is not updated. Kindly update it as soon as possible.\n\n`
      );
    }
    
    const isApproved = statusLower === "approved";
    const statusEmoji = isApproved ? "✅" : "⚠️";

    return (
      `ANPR Vehicle Update\n\n` +
      `${statusEmoji} *${plate.toUpperCase()}* - ${status.toUpperCase()}\n\n` +
      "Your vehicle registration has been expired. Fine: ₹5,000. Please resolve immediately.\n\n"
    );
  };

  try {
    const message = await client.messages.create({
      body: generateSMSMessage(plate, status),
      from: twilioPhoneNumber,
      to: number,
    });

    // Log successful SMS delivery
    console.log(`SMS sent to ${number}: SID ${message.sid}`);

    res.status(200).json({
      success: true,
      message: "SMS notification sent successfully",
      data: {
        recipient: number,
        vehiclePlate: plate,
        status: status,
        messageSid: message.sid,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("SMS delivery failed:", error);

    res.status(500).json({
      success: false,
      error: "Failed to send SMS notification",
      details: error.message,
      suggestion: "Please verify the phone number and try again later",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
