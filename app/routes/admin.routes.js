// app/routes/admin.routes.js
const express = require("express");
const router = express.Router();

const AdminController = require("../controllers/AdminController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");
const ProjectController = require("../controllers/ProjectController");
const PaymentController = require("../controllers/PaymentController");
const DisputeController = require("../controllers/DisputeController");
const AnalyticsController=require("../controllers/AnalyticsController");

router.use(AuthMiddleware.verifyAccessToken);
router.use(RoleMiddleware.authorizeRoles("admin"));

// Dashboard
router.get("/dashboard", AdminController.dashboard);


// ✅ User Management
router.get("/users", AdminController.manageUsers);
// User Management (AJAX Endpoints)
router.post("/users/approve/:id", AdminController.approveUserAjax);
router.post("/users/suspend/:id", AdminController.suspendUserAjax);
router.post("/users/reset-password/:id", AdminController.resetUserPasswordAjax);
router.post("/users/verify-identity/:id", AdminController.triggerIdentityVerificationAjax);
router.delete("/users/delete/:id", AdminController.deleteUserAjax);
router.post("/users/verify-email", AdminController.verifyUserByEmailAjax);

// ✅ Projects Management Page (renders projects.ejs)
router.get("/projects", ProjectController.getAllProjects);

// ✅ Payments Page
router.get("/payments", PaymentController.adminView); // <--- CONNECTED ROUTE

// Payment Actions (AJAX)
router.post("/payments/release/:id", PaymentController.releaseEscrow);
router.post("/payments/refund/:id", PaymentController.refundPayment);
router.post("/payments/withdraw/:id", PaymentController.processWithdrawal);

//⚖️ DISPUTE MANAGEMENT
router.get("/disputes", DisputeController.viewAll);
router.post("/disputes/handle/:id", DisputeController.handleDispute);
router.post("/disputes/process/:id", DisputeController.processRefundOrPayment);
router.get("/disputes/history/:id", DisputeController.viewHistory);

//Analytics management
router.get("/reports", AnalyticsController.getStats);

module.exports = router;
