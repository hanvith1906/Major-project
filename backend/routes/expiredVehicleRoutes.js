const express = require("express");
const router = express.Router();
const {
  addExpiredVehicle,
  getAllExpiredVehicles,
  deleteExpiredVehicle,
} = require("../controllers/expiredVehicleController");

// All routes for expired vehicles
router.post("/add", addExpiredVehicle);
router.get("/get-all", getAllExpiredVehicles);
router.post("/delete", deleteExpiredVehicle);

module.exports = router;


