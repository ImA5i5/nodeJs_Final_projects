// app/middleware/auth.middleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const redisClient = require("../config/redis");
const winston = require("../config/winston"); // optional logging

class AuthMiddleware {
  /**
   * ✅ Verify Access Token for Protected Routes
   */
  static async verifyAccessToken(req, res, next) {
    try {
      const token = req.cookies?.accessToken;

      if (!token) {
        req.flash("error", "Access denied. Please log in again.");
        return res.redirect("/auth/login");
      }

      // ✅ Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        req.flash("error", "Invalid or expired token.");
        return res.redirect("/auth/login");
      }

      // ✅ Optional: Check if account is suspended
      if (user.status === "suspended") {
        req.flash("error", "Your account has been suspended.");
        return res.redirect("/auth/login");
      }

      // ✅ Attach user to request
      req.user = user;
      next();
    } catch (err) {
      console.error("Auth Middleware Error:", err.message);
      req.flash("error", "Session expired. Please log in again.");
      return res.redirect("/auth/login");
    }
  }

  /**
   * 🔁 Refresh Access Token using Refresh Token
   */
  static async refreshAccessToken(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        winston.warn("No refresh token found in cookies");
        return res.status(403).json({ message: "No refresh token provided" });
      }

      // ✅ Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const userId = decoded.id;

      // ✅ Validate token against Redis
      const storedToken = await redisClient.get(`refresh:${userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        winston.warn("Invalid or mismatched refresh token");
        return res.status(403).json({ message: "Invalid refresh token" });
      }

      // ✅ Generate new access token
      const newAccessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
      });

      // ✅ Set new cookie
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000, // optional (15 min)
      });

      winston.info(`Access token refreshed for user ${userId}`);
      next();
    } catch (error) {
      console.error("Refresh Token Error:", error.message);
      return res.status(401).json({ message: "Token refresh failed. Please log in again." });
    }
  }
}

module.exports = AuthMiddleware;
