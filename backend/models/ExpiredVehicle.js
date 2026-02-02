const mongoose = require("mongoose");

const expiredVehicleSchema = new mongoose.Schema(
  {
    license: { type: String, required: true },
    status: { type: String, default: "Expired" },
    email: { type: String, required: true },
    number: { type: String, required: true },
    name: { type: String, required: true },
    notificationSentAt: { type: Date, default: Date.now },
    emailSent: { type: Boolean, default: true },
    smsSent: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const ExpiredVehicle = mongoose.model("ExpiredVehicle", expiredVehicleSchema);
module.exports = ExpiredVehicle;


