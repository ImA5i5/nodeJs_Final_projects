// app/routes/api/api.analytics.routes.js
const express = require("express");
const router = express.Router();

const ApiAnalyticsController = require("../../controllers/api/ApiAnalyticsController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");

// ✅ Require admin authentication
router.use(ApiAuth.verifyAccessToken);
router.use(ApiRole.allow("admin"));

// ✅ Dashboard summary
router.get("/summary", ApiAnalyticsController.getPlatformSummary);

// ✅ Time-based reports
router.get("/report", ApiAnalyticsController.getReport);

// ✅ User growth trends
router.get("/users", ApiAnalyticsController.getUserGrowth);

// ✅ Project performance
router.get("/projects", ApiAnalyticsController.getProjectPerformance);

// ✅ Export CSV report
router.get("/export", ApiAnalyticsController.exportCSV);

module.exports = router;
