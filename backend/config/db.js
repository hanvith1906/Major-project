const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://hanvith2004:hanvith@hanvith2004.nusgbwa.mongodb.net/?retryWrites=true&w=majority&appName=hanvith2004"
    );
    console.log("Connected to DB!");
  } catch (error) {
    console.log(error);
  }
};
module.exports = connectDB
