const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { Token } = require("../models");
const ApiError = require("../utils/ApiError");

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const generateToken = async (payload, type = "access") => {
  if (type === "access") {
    return jwt.sign(payload, config.JWT.SECRET, {
      expiresIn: config.JWT.ACCESS_EXPIRES_IN + "h",
    });
  } else if (type === "refresh") {
    const refresh = jwt.sign(payload, config.JWT.SECRET, {
      expiresIn: config.JWT.REFRESH_EXPIRES_IN + "d",
    });
    await createToken(
      payload.id,
      refresh,
      new Date(
        Date.now() + config.JWT.REFRESH_EXPIRES_IN * 24 * 60 * 60 * 1000,
      ),
    );
    return refresh;
  }
};

const createToken = async (
  userId,
  token,
  expiresAt,
  type = "refresh",
  meta = {},
) => {
  return await Token.create({
    user: userId,
    token: hashToken(token),
    type,
    expiresAt,
    ...meta,
  });
};

const getToken = async (token, type = "refresh") => {
  const hashed = hashToken(token);

  const tokenDoc = await Token.findOne({
    token: hashed,
    type,
  }).populate("user");

  if (!tokenDoc) {
    throw new ApiError(401, "Invalid or expired token");
  }

  return tokenDoc;
};

const deleteToken = async (token, type = "refresh") => {
  const hashed = hashToken(token);

  await Token.deleteOne({
    token: hashed,
    type,
  });
};

module.exports = {
  generateToken,
  createToken,
  getToken,
  deleteToken,
};
