const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const config = require("./config/config");
const logger = require("./config/logger");
const socketHandler = require("./socket");
const { connectRedis } = require("./config/redis");

const PORT = config.PORT;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

(async () => {
  try {
    await connectDB();
    await connectRedis();

    // Clear stale presence data from any previous server run
    const { redisClient } = require("./config/redis");
    const staleUserKeys = await redisClient.keys("user:*");
    if (staleUserKeys.length) await redisClient.del(staleUserKeys);
    await redisClient.del("online_users");

    socketHandler(io);

    server.listen(config.PORT, "0.0.0.0", () => {
      logger.info(`Server running on ${config.PORT}`);
    });
  } catch (err) {
    logger.error("Startup error:", err);
    process.exit(1);
  }
})();
