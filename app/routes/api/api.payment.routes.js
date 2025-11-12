// app/routes/api/api.payment.routes.js

const express = require("express");
const router = express.Router();

const ApiPaymentController = require("../../controllers/api/ApiPaymentController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");

router.use(ApiAuth.verifyAccessToken);

// ✅ Client creates Razorpay order
router.post("/create-order", ApiRole.allow("client"), ApiPaymentController.createOrder);

// ✅ Client verifies Razorpay payment
router.post("/verify", ApiRole.allow("client"), ApiPaymentController.verifyPayment);

// ✅ Client releases milestone payment to freelancer
router.patch("/milestone/:id/release", ApiRole.allow("client"), ApiPaymentController.releaseMilestone);

// ✅ Admin refunds client
router.patch("/:id/refund", ApiRole.allow("admin"), ApiPaymentController.refundPayment);

// ✅ Any user views their wallet balance
router.get("/wallet", ApiRole.allow("client", "freelancer"), ApiPaymentController.getWalletBalance);

// ✅ Client/Freelancer raises dispute
router.post("/dispute", ApiRole.allow("client", "freelancer"), ApiPaymentController.raiseDispute);

// ✅ All payment history
router.get("/history", ApiRole.allow("client", "freelancer", "admin"), ApiPaymentController.getPaymentHistory);

module.exports = router;
