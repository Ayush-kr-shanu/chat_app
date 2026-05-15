const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const { User } = require("../models");
const catchAsync = require("../utils/catchAsync");
const config = require("../config/config");

const auth = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Unauthorized: No token provided");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, config.JWT.SECRET);
  } catch (err) {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new ApiError(401, "User not found");
  }

  req.user = user;

  next();
});

module.exports = auth;
