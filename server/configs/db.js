const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { dbName: authDB });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.log("Error occured while connecting to db : ", error.message);
  }
};

module.exports = connectDB;
