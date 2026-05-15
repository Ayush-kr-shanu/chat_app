const mongoose = require("mongoose");
const config = require("./config");
const logger = require("./logger");

const connectDB = async () => {
  try {
    await mongoose.connect(config.DB_URL);
    logger.info("MongoDB connected successfully");
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
