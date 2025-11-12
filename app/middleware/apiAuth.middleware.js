// app/middleware/apiAuth.middleware.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const winston = require("../config/winston");

class ApiAuthMiddleware {
  /**
   * ✅ Verify JWT Access Token for API routes
   * Reads: Authorization: Bearer <token>
   */
  static async verifyAccessToken(req, res, next) {
    try {
      const authHeader = req.headers["authorization"];

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Access token missing" });
      }

      const token = authHeader.split(" ")[1];

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (user.status === "suspended") {
        return res.status(403).json({ message: "Account suspended" });
      }

      req.user = user; // attach logged-in user data
      next();

    } catch (err) {
      winston.error("API Auth Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = ApiAuthMiddleware;
