// app/middleware/cache.middleware.js
const redisClient = require("../config/redis");

class CacheMiddleware {
  static async getCache(req, res, next) {
    try {
      const key = req.originalUrl;
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }

      res.sendResponse = res.json;
      res.json = (body) => {
        redisClient.setEx(key, 300, JSON.stringify(body)); // cache for 5 minutes
        res.sendResponse(body);
      };

      next();
    } catch (err) {
      console.error("Cache Error:", err.message);
      next();
    }
  }

  static async clearCache(keyPattern = "*") {
    try {
      const keys = await redisClient.keys(keyPattern);
      if (keys.length) await redisClient.del(keys);
    } catch (err) {
      console.error("Cache Clear Error:", err.message);
    }
  }
}

module.exports = CacheMiddleware;
