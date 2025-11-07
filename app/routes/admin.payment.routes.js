// app/routes/admin.payment.routes.js
const router = require("express").Router();
const AdminPaymentController = require("../controllers/AdminPaymentController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");

// ✅ Authentication + Admin Role
router.use(AuthMiddleware.verifyAccessToken);
router.use(RoleMiddleware.authorizeRoles("admin"));

// ✅ Admin: All Transactions
router.get("/", AdminPaymentController.allTransactions);

// ✅ Admin: Payout
router.post("/payout", AdminPaymentController.payout);

// ✅ Admin: Project Monitor
router.get("/project-monitor", AdminPaymentController.projectMonitor);

module.exports = router;
