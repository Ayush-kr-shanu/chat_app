const httpStatus = require('http-status');
const logger = require('../config/logger');
const catchAsync = require('../utils/catchAsync');
const { userService, tokenService } = require('../services');

const myProfile = catchAsync(async (request, response) => {
  logger.info("*** Get my profile ****");
  const user = await userService.getUserById(request.user.id);
  if (!user) {
    logger.error(`User not found: ${request.user.id}`);
    return response.status(httpStatus.NOT_FOUND).json({ message: 'User not found' });
  }
  delete user.password;
  response.json(user);
});

const getCurrentUser = catchAsync(async (request, response) => {
  logger.info("*** Get current user ****");
  const user = await userService.getUserById(request.user.id);
  if (!user) {
    logger.error(`User not found: ${request.user.id}`);
    return response.status(httpStatus.NOT_FOUND).json({ message: 'User not found' });
  }
  delete user.password;
  response.json(user);
});

const searchUsers = catchAsync(async (request, response) => {
  logger.info("*** Search users ****");
  const users = await userService.searchUsers(request.query, request.user?._id);
  response.json(users);
});

module.exports = {
  myProfile,
  getCurrentUser,
  searchUsers,
};