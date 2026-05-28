const logger = require("../config/logger");
const { redisClient } = require("../config/redis");
const { conversationService } = require("../services");
const { Conversation } = require("../models");

const registerChatHandlers = (io, socket) => {
  socket.on("send_message", async ({ roomId, receiverId, message }) => {
    try {
      socket.to(roomId).emit("receive_message", message);

      // Resolve recipients from the conversation itself so delivery does not
      // depend on potentially stale/missing receiverId from the client.
      const senderId = String(message?.senderId ?? "");
      const conversation = roomId
        ? await Conversation.findById(roomId).select("participants")
        : null;

      let recipientIds = [];
      if (conversation?.participants?.length) {
        recipientIds = conversation.participants
          .map((p) => String(p))
          .filter((id) => id && id !== senderId);
      } else if (receiverId) {
        recipientIds = [String(receiverId)];
      }

      for (const recipientId of recipientIds) {
        const receiverSocket = await redisClient.get(`user:${recipientId}`);
        if (receiverSocket) {
          io.to(receiverSocket).emit("receive_message", message);
        }
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