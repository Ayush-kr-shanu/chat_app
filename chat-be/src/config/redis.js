const { createClient } = require("redis");
const logger = require("./logger");

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

redisClient.on("connect", () => logger.info("✅ Redis connected"));
redisClient.on("ready", () => logger.info("🟢 Redis ready"));
redisClient.on("error", (err) => logger.error("❌ Redis error:", err));
redisClient.on("end", () => logger.warn("🔌 Redis connection closed"));

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

module.exports = { redisClient, connectRedis };