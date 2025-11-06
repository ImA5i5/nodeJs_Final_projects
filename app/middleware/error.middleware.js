// app/middleware/error.middleware.js
const winston = require("../config/winston");

class ErrorMiddleware {
  static async globalErrorHandler(err, req, res, next) {
    winston.error(`[${req.method}] ${req.url} - ${err.message}`);

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (req.originalUrl.startsWith("/api")) {
      res.status(statusCode).json({ success: false, message });
    } else {
      res.status(statusCode).render("pages/error/error", { message });
    }
  }
}

module.exports = ErrorMiddleware;
