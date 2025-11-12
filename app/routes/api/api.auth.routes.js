// app/routes/api/api.auth.routes.js

const express = require("express");
const router = express.Router();
const ApiAuthController = require("../../controllers/api/ApiAuthController");

// ✅ Signup OTP
router.post("/send-otp", ApiAuthController.sendSignupOtp);

// ✅ Verify OTP
router.post("/verify-otp", ApiAuthController.verifySignupOtp);

// ✅ Login
router.post("/login", ApiAuthController.login);

// ✅ Refresh Token
router.post("/refresh-token", ApiAuthController.refreshToken);

// ✅ Logout
router.post("/logout", ApiAuthController.logout);

module.exports = router;
