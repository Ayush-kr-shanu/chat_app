const logger = require("./config/logger");
const { redisClient } = require("./config/redis");
const registerSocketHandlers = require("./socket/index");

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    logger.info(`🟢 User connected: ${socket.id}`);

    registerSocketHandlers(io, socket);
  });
};

module.exports = socketHandler;