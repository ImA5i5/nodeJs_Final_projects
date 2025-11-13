// app/config/redis.js
const { createClient } = require("redis");
const winston = require("./winston");

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  legacyMode: true, // Required for connect-redis 6.x
});

// redisClient.on("connect", () => winston.info("✅ Redis connected"));
// redisClient.on("ready", () => winston.info("🚀 Redis ready"));
// redisClient.on("error", (err) => winston.error("❌ Redis error: " + err.message));
// redisClient.on("end", () => winston.warn("⚠️ Redis connection closed"));
// redisClient.on("reconnecting", () => winston.warn("♻️ Redis reconnecting..."));

(async () => {
  try {
    if (!redisClient.isOpen) await redisClient.connect();
    // winston.info("🔗 Redis client connected successfully");
  } catch (err) {
    winston.error("❌ Redis connection failed: " + err.message);
  }
})();

module.exports = redisClient;
