const catchAsync = require("../utils/catchAsync");
const { userService, tokenService } = require("../services");

const register = catchAsync(async (request, response) => {
  const user = await userService.createUser(request.body);
  response.status(201).json({ message: "User registered successfully", user });
});

const login = catchAsync(async (request, response) => {
  const user = await userService.getUserByEmail(request.body);
  const accessToken = await tokenService.generateToken(
    { id: user.id },
    "access",
  );
  const refreshToken = await tokenService.generateToken(
    { id: user.id },
    "refresh",
  );
  const tokens = { accessToken: accessToken, refreshToken: refreshToken };
  delete user.password;
  return response.send({ tokens, user });
});

module.exports = {
  register,
  login,
};
