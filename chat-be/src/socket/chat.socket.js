const logger = require("../config/logger");
const { redisClient } = require("../config/redis");
const { conversationService } = require("../services");

const registerChatHandlers = (io, socket) => {
  socket.on("send_message", async ({ roomId, receiverId, message }) => {
    try {
      socket.to(roomId).emit("receive_message", message);

      const receiverSocket = await redisClient.get(`user:${receiverId}`);

      if (receiverSocket) {
        io.to(receiverSocket).emit("receive_message", message);
      }
    } catch (err) {
      logger.error("Send message error:", err);
    }
  });

  socket.on("message_delivered", ({ roomId, messageId }) => {
    socket.to(roomId).emit("message_delivered", { messageId });
  });

  socket.on("message_read", ({ roomId, messageId, userId }) => {
    socket.to(roomId).emit("message_read", {
      messageId,
      userId,
    });
  });

  socket.on("mark_as_read", async ({ roomId, userId }) => {
    try {
      await conversationService.markMessageAsSeen(roomId, userId);
    } catch (err) {
      logger.error("mark_as_read DB error:", err);
    }
    socket.to(roomId).emit("messages_read", {
      roomId,
      userId,
    });
  });
  socket.on("typing", ({ roomId, senderId }) => {
    socket.to(roomId).emit("typing", { senderId });
  });

  socket.on("stop_typing", ({ roomId, senderId }) => {
    socket.to(roomId).emit("stop_typing", { senderId });
  });
};

module.exports = registerChatHandlers