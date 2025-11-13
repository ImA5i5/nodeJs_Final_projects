// app/routes/api/api.analytics.routes.js
const express = require("express");
const router = express.Router();

const ApiAnalyticsController = require("../../controllers/api/ApiAnalyticsController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");

// 🔐 Require admin authentication
router.use(ApiAuth.verifyAccessToken);
router.use(ApiRole.allow("admin"));

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Admin reporting, dashboards, growth charts, revenue insights
 */

/**
 * @swagger
 * /api/analytics/summary:
 *   get:
 *     summary: Get platform-wide statistics summary
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Returns high-level dashboard metrics like:
 *       - total users  
 *       - total clients  
 *       - total freelancers  
 *       - completed projects  
 *       - total revenue  
 *       - disputes count  
 *       - weekly activity  
 *     responses:
 *       200:
 *         description: Dashboard summary data
 */
router.get("/summary", ApiAnalyticsController.getPlatformSummary);

/**
 * @swagger
 * /api/analytics/report:
 *   get:
 *     summary: Get time-based analytics report (daily/weekly/monthly)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *         example: monthly
 *         description: Time period filter for the analytics report
 *     responses:
 *       200:
 *         description: Time-based analytics returned
 */
router.get("/report", ApiAnalyticsController.getReport);

/**
 * @swagger
 * /api/analytics/users:
 *   get:
 *     summary: Get user registration growth trends
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Provides user sign-up trends, active vs inactive accounts, and retention analytics.
 *     responses:
 *       200:
 *         description: User growth data returned
 */
router.get("/users", ApiAnalyticsController.getUserGrowth);

/**
 * @swagger
 * /api/analytics/projects:
 *   get:
 *     summary: Get project performance analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Includes metrics like:
 *       - approved vs rejected projects  
 *       - average budget  
 *       - milestone completion rate  
 *       - delivery time performance  
 *     responses:
 *       200:
 *         description: Project analytics returned
 */
router.get("/projects", ApiAnalyticsController.getProjectPerformance);

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics data as CSV
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Generates a downloadable CSV file containing analytics data  
 *       (users, revenue, projects, disputes).
 *     responses:
 *       200:
 *         description: CSV download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: "date,totalUsers,totalProjects,revenue\n2024-05-01,1200,540,40000"
 */
router.get("/export", ApiAnalyticsController.exportCSV);

module.exports = router;
