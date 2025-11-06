// app/routes/auth.routes.js
const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");
const RateLimitMiddleware = require("../middleware/rateLimit.middleware");

// ======================
// AUTHENTICATION ROUTES
// ======================

// 1️⃣ Register (GET + POST)
router.get("/register", AuthController.getRegister);
router.post("/register", AuthController.register);

// 2️⃣ OTP Verification (GET + POST)
router.get("/verify-otp", AuthController.getOtpPage);
router.post("/verify-otp", AuthController.verifyOtp);

// 3️⃣ Login (GET + POST)
router.get("/login", AuthController.getLogin);
router.post("/login", RateLimitMiddleware.loginLimiter, AuthController.login);

// 4️⃣ Logout
router.get("/logout", AuthController.logout);

module.exports = router;
