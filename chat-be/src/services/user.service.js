const httpStatus = require("http-status");
const logger = require("../config/logger");
const { User } = require("../models");
const ApiError = require("../utils/ApiError");
const connectDB = require("../config/db");

const createUser = async (userData) => {
  try {
    const user = await User.create(userData);
    return user;
  } catch (error) {
    logger.error("Error creating user:", error);
    throw error;
  }
};

const getUserByEmail = async (params) => {
  const { email, password } = params;
  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }
    if (password && !(await user.validatePassword(password))) {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid password");
    }
    return user;
  } catch (error) {
    logger.error("Error fetching user by email:", error);
    throw error;
  }
};

const searchUsers = async (query, excludeUserId) => {
  try {
    const searchTerm = typeof query === 'object' ? (query.search || query.name || '') : query;
    const filter = {
      $or: [
        { name:  { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
      ],
    };
    if (excludeUserId) {
      filter._id = { $ne: excludeUserId };
    }
    const users = await User.find(filter).select("-password");
    return users;
  } catch (error) {
    logger.error("Error searching users:", error);
    throw error;
  }
};

module.exports = {
  createUser,
  getUserByEmail,
  searchUsers,
};
