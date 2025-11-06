const jwt = require("jsonwebtoken");
const redisClient = require("../config/redis");
const winston = require("../config/winston");

class JwtService {
  static async generateTokens(userId) {
    const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    });

    const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    });

    // ✅ Make sure the refreshToken is a string
    if (typeof refreshToken !== "string") {
      winston.warn("⚠️ refreshToken is not a string:", typeof refreshToken);
    }

    await redisClient.set(`refresh:${userId}`, refreshToken); // ✅ string only
    return { accessToken, refreshToken };
  }
}

module.exports = JwtService;
