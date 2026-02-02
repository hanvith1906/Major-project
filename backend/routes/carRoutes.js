const express = require("express");
const router = express.Router();
const {
  addCar,
  deleteCar,
  updateStatus,
  getAllCars,
  getSingleCar,
} = require("../controllers/carController");

// All POST routes using req.body
router.post("/add", addCar);
router.post("/delete", deleteCar);
router.post("/update-status", updateStatus);
router.get("/get-all", getAllCars);
router.post("/get-one", getSingleCar);

module.exports = router;
