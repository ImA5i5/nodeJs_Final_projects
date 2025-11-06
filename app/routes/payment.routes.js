// app/routes/payment.routes.js
const express = require("express");
const router = express.Router();

const PaymentController = require("../controllers/PaymentController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");

router.use(AuthMiddleware.verifyAccessToken);

// Payment History
router.get("/history", PaymentController.history);


// Admin Payment Management
router.get("/admin/all", RoleMiddleware.authorizeRoles("admin"), PaymentController.adminView);
router.post("/admin/release/:id", RoleMiddleware.authorizeRoles("admin"), PaymentController.releaseEscrow);
router.post("/admin/refund/:id", RoleMiddleware.authorizeRoles("admin"), PaymentController.refundPayment);
router.post("/admin/withdraw/:id", RoleMiddleware.authorizeRoles("admin"), PaymentController.processWithdrawal);

//freelancer payment Management

/* ==================== FREELANCER ==================== */

    // 💰 Freelancer Earnings Dashboard
router.get("/freelancer/earnings",RoleMiddleware.authorizeRoles("freelancer"), PaymentController.freelancerEarnings);

// 💼 View escrow & pending payments
router.get("/freelancer/escrow",RoleMiddleware.authorizeRoles("freelancer"), PaymentController.viewEscrowPayments);

// 🔄 AJAX Filter Payments by Status
router.get("/freelancer/filter",RoleMiddleware.authorizeRoles("freelancer"), PaymentController.filterPayments);

// 🏦 Request Withdrawal
router.post("/freelancer/withdraw",RoleMiddleware.authorizeRoles("freelancer"), PaymentController.requestWithdrawal);

// 📄 Download Invoice
router.get("/freelancer/invoice/:id",RoleMiddleware.authorizeRoles("freelancer"), PaymentController.downloadInvoice);

// 🔁 AJAX Summary Refresh
router.get("/freelancer/earnings/data",RoleMiddleware.authorizeRoles("freelancer"), PaymentController.getEarningsData);

/* ==================== CLIENT ==================== */
router.get("/client/payments", RoleMiddleware.authorizeRoles("client"), PaymentController.clientPayments);
router.post("/client/deposit", RoleMiddleware.authorizeRoles("client"), PaymentController.depositEscrow);
router.post("/client/release/:id", RoleMiddleware.authorizeRoles("client"), PaymentController.releasePayment);
router.post("/client/refund/:id", RoleMiddleware.authorizeRoles("client"), PaymentController.requestRefund);

module.exports = router;
