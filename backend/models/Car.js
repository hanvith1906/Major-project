const mongoose = require("mongoose");

const carSchema = new mongoose.Schema(
  {
    license: { type: String },
    status: { type: String, default: "Unknown" },
    email: { type: String },
    number:{type:String},
    name:{type:String}
  },
  {
    timestamps: true,
  }
);

const Car = mongoose.model("Car", carSchema);
module.exports = Car;
