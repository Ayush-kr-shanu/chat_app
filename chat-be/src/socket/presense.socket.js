const logger = require("../config/logger");
const { redisClient } = require("../config/redis");
const { conversationService } = require("../services");

const ONLINE_USERS_KEY = "online_users";

const presenceHandler = (io, socket) => {
  socket.on("join", async (userId) => {
    try {
      await redisClient.set(`user:${userId}`, socket.id);

      await redisClient.sAdd(ONLINE_USERS_KEY, userId);

      socket.join(userId);

      const updatedRooms =
        await conversationService.markMessagesDelivered(userId);

      // notify rooms
      updatedRooms.forEach((roomId) => {
        io.to(roomId).emit("messages_delivered", {
          roomId,
        });
      });

      const users = await redisClient.sMembers(ONLINE_USERS_KEY);

      io.emit("online_users", users);

      logger.info(`User ${userId} online`);
    } catch (err) {
      logger.error("Presence join error:", err);
    }
  });

  socket.on("disconnect", async () => {
    try {
      const keys = await redisClient.keys("user:*");

      let disconnectedUser = null;

      for (let key of keys) {
        const socketId = await redisClient.get(key);

        if (socketId === socket.id) {
          disconnectedUser = key.split(":")[1];

          await redisClient.del(key);

          await redisClient.sRem(ONLINE_USERS_KEY, disconnectedUser);

          break;
        }
      }

      if (disconnectedUser) {
        const users = await redisClient.sMembers(ONLINE_USERS_KEY);

        io.emit("online_users", users);

        logger.info(`🔴 User disconnected: ${disconnectedUser}`);
      }
    } catch (err) {
      logger.error("Disconnect error:", err);
    }
  });
};

module.exports = presenceHandler;
