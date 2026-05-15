const config = require("../config/config");
const ApiError = require("../utils/ApiError");

// 🔥 Handle Mongo Duplicate Key Error
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];

  return new ApiError(
    400,
    `${field} "${value}" already exists`
  );
};

// 🔥 Handle Mongoose Validation Error
const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map(el => el.message);
  return new ApiError(400, messages.join(", "));
};

// 🔥 Handle Invalid ObjectId
const handleCastError = (err) => {
  return new ApiError(400, `Invalid ${err.path}: ${err.value}`);
};


// ================= DEV =================
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    message: err.message,
    stack: err.stack,
  });
};


// ================= PROD =================
const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};


// ================= GLOBAL HANDLER =================
const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }

  if (err.name === "ValidationError") {
    error = handleValidationError(err);
  }

  if (err.name === "CastError") {
    error = handleCastError(err);
  }

  if (config.NODE_ENV === "development") {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

module.exports = globalErrorHandler;