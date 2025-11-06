// app/routes/dispute.routes.js
const express = require("express");
const router = express.Router();

const DisputeController = require("../controllers/DisputeController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");

// ✅ Only admin can manage disputes
router.use(AuthMiddleware.verifyAccessToken);
router.use(RoleMiddleware.authorizeRoles("admin"));

// 🧾 View All Disputes (Admin Dashboard)
router.get("/", DisputeController.viewAll);

// 🧠 Handle dispute actions (resolve / in-review)
router.post("/handle/:id", DisputeController.handleDispute);

// 💸 Approve refund or release payment
router.post("/process/:id", DisputeController.processRefundOrPayment);

// 🕒 View full dispute history
router.get("/history/:id", DisputeController.viewHistory);
router.get("/disputes/history/:id", DisputeController.viewHistory);


module.exports = router;
