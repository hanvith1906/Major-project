const Car = require("../models/Car");

// Add Car
const addCar = async (req, res) => {
  try {
    const { license, status, email, number , name } = req.body;
    const newCar = new Car({ license, status, email, number , name });
    await newCar.save();
    res.status(201).json({ message: "Car added successfully", car: newCar , success:true });
  } catch (error) {
    res.status(500).json({ message: "Error adding car", error });
  }
};

// Delete Car
const deleteCar = async (req, res) => {
  try {
    const { id } = req.body;
    const deletedCar = await Car.findByIdAndDelete(id);
    if (!deletedCar) {
      return res.status(404).json({ message: "Car not found" });
    }
    res.status(200).json({ message: "Car deleted successfully" , success:true });
  } catch (error) {
    res.status(500).json({ message: "Error deleting car", error });
  }
};

// Update Car Status
const updateStatus = async (req, res) => {
  try {
    const { id, status } = req.body;
    const updatedCar = await Car.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!updatedCar) {
      return res.status(404).json({ message: "Car not found" });
    }
    res.status(200).json({ message: "Status updated", car: updatedCar });
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error });
  }
};

// Get All Cars
const getAllCars = async (req, res) => {
  try {
    const cars = await Car.find();
    res.status(200).json({ cars });
  } catch (error) {
    res.status(500).json({ message: "Error fetching cars", error });
  }
};

// Get Single Car
const getSingleCar = async (req, res) => {
  try {
    const { id } = req.body;
    const car = await Car.findById(id);
    if (!car) {
      return res.status(404).json({ message: "Car not found" });
    }
    res.status(200).json({ car });
  } catch (error) {
    res.status(500).json({ message: "Error fetching car", error });
  }
};

module.exports = {
  addCar,
  deleteCar,
  updateStatus,
  getAllCars,
  getSingleCar,
};
