// app/services/cache.service.js
const redisClient = require("../config/redis");
const winston = require("../config/winston");

class CacheService {
  static async set(key, value, expiry = 300) {
    try {
      await redisClient.setEx(key, expiry, JSON.stringify(value));
    } catch (err) {
      winston.error("Cache set error: " + err.message);
    }
  }

  static async get(key) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      winston.error("Cache get error: " + err.message);
      return null;
    }
  }

  static async del(key) {
    try {
      await redisClient.del(key);
    } catch (err) {
      winston.error("Cache delete error: " + err.message);
    }
  }
}

module.exports = CacheService;
