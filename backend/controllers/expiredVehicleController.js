const ExpiredVehicle = require("../models/ExpiredVehicle");

// Add Expired Vehicle (only when notifications are sent successfully)
const addExpiredVehicle = async (req, res) => {
  try {
    const { license, status, email, number, name } = req.body;
    
    // Check if this vehicle already exists in expired vehicles
    const existingVehicle = await ExpiredVehicle.findOne({ license });
    if (existingVehicle) {
      return res.status(200).json({ 
        message: "Vehicle already exists in expired vehicles list", 
        vehicle: existingVehicle,
        success: true 
      });
    }

    const newExpiredVehicle = new ExpiredVehicle({ 
      license, 
      status: status || "Expired", 
      email, 
      number, 
      name,
      emailSent: true,
      smsSent: true,
    });
    await newExpiredVehicle.save();
    res.status(201).json({ 
      message: "Expired vehicle added successfully", 
      vehicle: newExpiredVehicle, 
      success: true 
    });
  } catch (error) {
    res.status(500).json({ message: "Error adding expired vehicle", error });
  }
};

// Get All Expired Vehicles
const getAllExpiredVehicles = async (req, res) => {
  try {
    const expiredVehicles = await ExpiredVehicle.find().sort({ createdAt: -1 });
    res.status(200).json({ expiredVehicles });
  } catch (error) {
    res.status(500).json({ message: "Error fetching expired vehicles", error });
  }
};

// Delete Expired Vehicle
const deleteExpiredVehicle = async (req, res) => {
  try {
    const { id } = req.body;
    const deletedVehicle = await ExpiredVehicle.findByIdAndDelete(id);
    if (!deletedVehicle) {
      return res.status(404).json({ message: "Expired vehicle not found" });
    }
    res.status(200).json({ message: "Expired vehicle deleted successfully", success: true });
  } catch (error) {
    res.status(500).json({ message: "Error deleting expired vehicle", error });
  }
};

module.exports = {
  addExpiredVehicle,
  getAllExpiredVehicles,
  deleteExpiredVehicle,
};


