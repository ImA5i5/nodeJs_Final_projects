// app/routes/analytics.routes.js
const express = require("express");
const router = express.Router();

const AnalyticsController = require("../controllers/AnalyticsController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");

// ✅ Secure all routes (Admin Only)
router.use(AuthMiddleware.verifyAccessToken);
router.use(RoleMiddleware.authorizeRoles("admin"));

/* ==========================================
   📊 MAIN DASHBOARD ANALYTICS & REPORTS
========================================== */
router.get("/reports", AnalyticsController.getStats);

/* ==========================================
   🗓️ AUTOMATED PERIODIC REPORTS (Daily/Weekly/Monthly)
   - Generates data for exports or charts
========================================== */
router.get("/reports/period/:type", AnalyticsController.getPeriodicReport); // e.g., /analytics/reports/period/monthly

/* ==========================================
   🧠 USER PERFORMANCE INSIGHTS
   - Track most active users, new signups, etc.
========================================== */
router.get("/reports/users", AnalyticsController.getUserPerformance);

/* ==========================================
   💼 PROJECT PERFORMANCE
   - Track project volume, completion rate, etc.
========================================== */
router.get("/reports/projects", AnalyticsController.getProjectPerformance);

/* ==========================================
   💰 TOP PERFORMERS (Leaderboards)
   - Top Freelancers & Clients by earnings or spending
========================================== */
router.get("/reports/leaderboard", AnalyticsController.getTopPerformers);

/* ==========================================
   ⬇️ EXPORT ANALYTICS REPORT (CSV/JSON)
   - Admin can export summarized financial/user/project data
========================================== */
router.get("/reports/export/:format", AnalyticsController.exportReport);

module.exports = router;
