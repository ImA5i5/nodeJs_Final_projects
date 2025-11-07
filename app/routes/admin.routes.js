// app/routes/admin.routes.js
const express = require("express");
const router = express.Router();

const AdminController = require("../controllers/AdminController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");

const ProjectController = require("../controllers/ProjectController");
const AdminPaymentController = require("../controllers/AdminPaymentController");
const DisputeController = require("../controllers/DisputeController");
const AnalyticsController = require("../controllers/AnalyticsController");

// ✅ Admin auth protection
router.use(AuthMiddleware.verifyAccessToken);
router.use(RoleMiddleware.authorizeRoles("admin"));

// ✅ Dashboard
router.get("/dashboard", AdminController.dashboard);

// ✅ Users
router.get("/users", AdminController.manageUsers);
router.post("/users/approve/:id", AdminController.approveUserAjax);
router.post("/users/suspend/:id", AdminController.suspendUserAjax);
router.post("/users/reset-password/:id", AdminController.resetUserPasswordAjax);
router.post("/users/verify-identity/:id", AdminController.triggerIdentityVerificationAjax);
router.delete("/users/delete/:id", AdminController.deleteUserAjax);
router.post("/users/verify-email", AdminController.verifyUserByEmailAjax);

// ✅ Project Management
router.get("/projects", ProjectController.getAllProjects);

// ✅ Payments (FIXED)
router.get("/payments", AdminPaymentController.allTransactions);
router.post("/payments/payout", AdminPaymentController.payout);

// ✅ Project Monitoring (FIXED)
router.get("/project-monitor", AdminPaymentController.projectMonitor);

// ✅ Dispute Management
router.get("/disputes", DisputeController.list);
router.put("/disputes/resolve", DisputeController.resolve);

// ❌ Removed INVALID route (method doesn't exist)
// router.get("/disputes/history/:id", DisputeController.viewHistory);

// ✅ Reports
router.get("/reports", AnalyticsController.getStats);

module.exports = router;
