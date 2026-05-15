const logger = require("../config/logger");

const roomHandler = (io, socket) => {
  socket.on("join_room", (roomId) => {
    if (!roomId) {
      logger.warn("join_room event missing roomId");
      return;
    }
    socket.join(roomId);
    logger.info(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on("leave_room", (roomId) => {
    if (!roomId) {
      logger.warn("leave_room event missing roomId");
      return;
    }
    socket.leave(roomId);
    logger.info(`Socket ${socket.id} left room ${roomId}`);
  })
};

module.exports = roomHandler;
