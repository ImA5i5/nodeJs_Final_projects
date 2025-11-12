const express = require("express");
const router = express.Router();

const ApiAdminController = require("../../controllers/api/ApiAdminController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");

// ✅ Only admins can access these APIs
router.use(ApiAuth.verifyAccessToken);
router.use(ApiRole.allow("admin"));

router.get("/dashboard", ApiAdminController.getDashboardStats);
router.get("/pending-users", ApiAdminController.getPendingUsers);
router.post("/verify-user", ApiAdminController.verifyUser);
router.post("/activate-user", ApiAdminController.activateUser);
router.post("/update-role", ApiAdminController.updateUserRole);
router.post("/suspend-user", ApiAdminController.suspendUser);
router.post("/reset-password", ApiAdminController.resetPassword);
router.post("/delete-user", ApiAdminController.deleteUser);
router.get("/logs", ApiAdminController.getLogs);

module.exports = router;
