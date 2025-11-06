// app/middleware/rateLimit.middleware.js
const rateLimit = require("express-rate-limit");

const RateLimitMiddleware = {
  loginLimiter: rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // limit each IP to 5 login attempts
    message: "Too many login attempts, please try again later.",
  }),

  apiLimiter: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // limit API calls per IP
    message: "Too many requests from this IP, please slow down.",
  }),
};

module.exports = RateLimitMiddleware;
