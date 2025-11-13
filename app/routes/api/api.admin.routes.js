// api.admin.routes.js
const express = require("express");
const router = express.Router();

const ApiAdminController = require("../../controllers/api/ApiAdminController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");

// --------------------------------------------------------
// Protect All Admin Routes
// --------------------------------------------------------
router.use(ApiAuth.verifyAccessToken);
router.use(ApiRole.allow("admin"));

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only platform management APIs
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get platform dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data fetched successfully
 *       403:
 *         description: Only admins allowed
 */
router.get("/dashboard", ApiAdminController.getDashboardStats);

/**
 * @swagger
 * /api/admin/pending-users:
 *   get:
 *     summary: Get list of users waiting for admin approval
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending users
 */
router.get("/pending-users", ApiAdminController.getPendingUsers);

/**
 * @swagger
 * /api/admin/verify-user:
 *   post:
 *     summary: Verify a user's identity/documents
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 64f3a2acb12c4f439d825c39
 *     responses:
 *       200:
 *         description: User verified successfully
 */
router.post("/verify-user", ApiAdminController.verifyUser);

/**
 * @swagger
 * /api/admin/activate-user:
 *   post:
 *     summary: Activate a user account after verification
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 64f3a2acb12c4f439d825c39
 *     responses:
 *       200:
 *         description: User activated successfully
 */
router.post("/activate-user", ApiAdminController.activateUser);

/**
 * @swagger
 * /api/admin/update-role:
 *   post:
 *     summary: Update a user's role and permissions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, role]
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 64f3a2acb12c4f439d825c39
 *               role:
 *                 type: string
 *                 enum: [client, freelancer, admin]
 *                 example: freelancer
 *     responses:
 *       200:
 *         description: User role updated
 */
router.post("/update-role", ApiAdminController.updateUserRole);

/**
 * @swagger
 * /api/admin/suspend-user:
 *   post:
 *     summary: Suspend a user's account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, reason]
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 64f3a2acb12c4f439d825c39
 *               reason:
 *                 type: string
 *                 example: Violation of policies
 *     responses:
 *       200:
 *         description: User suspended successfully
 */
router.post("/suspend-user", ApiAdminController.suspendUser);

/**
 * @swagger
 * /api/admin/reset-password:
 *   post:
 *     summary: Reset a user's password (admin override)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, newPassword]
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 64f3a2acb12c4f439d825c39
 *               newPassword:
 *                 type: string
 *                 example: NewSecurePass123
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post("/reset-password", ApiAdminController.resetPassword);

/**
 * @swagger
 * /api/admin/delete-user:
 *   post:
 *     summary: Permanently delete a user account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 example: 64f3a2acb12c4f439d825c39
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.post("/delete-user", ApiAdminController.deleteUser);

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: View platform activity logs
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logs fetched successfully
 */
router.get("/logs", ApiAdminController.getLogs);



module.exports = router;
