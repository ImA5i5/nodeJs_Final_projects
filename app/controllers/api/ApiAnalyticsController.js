// app/controllers/api/ApiAnalyticsController.js
const User = require("../../models/User");
const Project = require("../../models/Project");
const Payment = require("../../models/Payment");
const Dispute = require("../../models/Dispute");
const { Parser } = require("json2csv");
const winston = require("../../config/winston");

class ApiAnalyticsController {
  /**
   * ✅ Admin Dashboard Summary
   * GET /api/analytics/summary
   */
  static async getPlatformSummary(req, res) {
    try {
      const [totalUsers, totalProjects, completedProjects, totalRevenue, totalDisputes] =
        await Promise.all([
          User.countDocuments(),
          Project.countDocuments(),
          Project.countDocuments({ status: "completed" }),
          Payment.aggregate([
            { $match: { status: { $in: ["released", "completed"] } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]),
          Dispute.countDocuments(),
        ]);

      const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

      return res.json({
        message: "✅ Platform analytics summary fetched successfully",
        data: {
          totalUsers,
          totalProjects,
          completedProjects,
          totalRevenue: revenue,
          totalDisputes,
        },
      });
    } catch (err) {
      winston.error("Get Platform Summary Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ Generate report by time range
   * GET /api/analytics/report?range=daily|weekly|monthly
   */
  static async getReport(req, res) {
    try {
      const { range = "daily" } = req.query;
      const now = new Date();
      let startDate = new Date();

      if (range === "weekly") startDate.setDate(now.getDate() - 7);
      else if (range === "monthly") startDate.setMonth(now.getMonth() - 1);
      else startDate.setDate(now.getDate() - 1);

      const [newUsers, newProjects, completedProjects, releasedPayments, newDisputes] =
        await Promise.all([
          User.countDocuments({ createdAt: { $gte: startDate } }),
          Project.countDocuments({ createdAt: { $gte: startDate } }),
          Project.countDocuments({ status: "completed", updatedAt: { $gte: startDate } }),
          Payment.aggregate([
            { $match: { createdAt: { $gte: startDate }, status: { $in: ["released", "completed"] } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ]),
          Dispute.countDocuments({ createdAt: { $gte: startDate } }),
        ]);

      const totalRevenue =
        releasedPayments.length > 0 ? releasedPayments[0].total : 0;

      const report = {
        range,
        startDate,
        newUsers,
        newProjects,
        completedProjects,
        totalRevenue,
        newDisputes,
      };

      return res.json({
        message: `📊 ${range.charAt(0).toUpperCase() + range.slice(1)} report generated successfully`,
        report,
      });
    } catch (err) {
      winston.error("Get Analytics Report Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ User Growth & Engagement Analytics
   * GET /api/analytics/users
   */
  static async getUserGrowth(req, res) {
    try {
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const userGrowth = await User.aggregate([
        { $match: { createdAt: { $gte: last30Days } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      const totalActiveUsers = await User.countDocuments({ status: "active" });

      return res.json({
        message: "✅ User growth analytics fetched successfully",
        data: {
          totalActiveUsers,
          userGrowthTrend: userGrowth,
        },
      });
    } catch (err) {
      winston.error("User Growth Analytics Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ Project Performance Overview
   * GET /api/analytics/projects
   */
  static async getProjectPerformance(req, res) {
    try {
      const [total, completed, inProgress, disputed] = await Promise.all([
        Project.countDocuments(),
        Project.countDocuments({ status: "completed" }),
        Project.countDocuments({ status: "in-progress" }),
        Project.countDocuments({ status: "disputed" }),
      ]);

      return res.json({
        message: "✅ Project performance metrics fetched",
        data: {
          total,
          completed,
          inProgress,
          disputed,
          completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) + "%" : "0%",
        },
      });
    } catch (err) {
      winston.error("Project Performance Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ Export report as CSV
   * GET /api/analytics/export?range=weekly
   */
  static async exportCSV(req, res) {
    try {
      const { range = "weekly" } = req.query;
      const now = new Date();
      let startDate = new Date();

      if (range === "weekly") startDate.setDate(now.getDate() - 7);
      else if (range === "monthly") startDate.setMonth(now.getMonth() - 1);
      else startDate.setDate(now.getDate() - 1);

      const [users, projects, payments, disputes] = await Promise.all([
        User.find({ createdAt: { $gte: startDate } }).select("fullName email role createdAt"),
        Project.find({ createdAt: { $gte: startDate } }).select("title status budget createdAt"),
        Payment.find({ createdAt: { $gte: startDate } }).select("amount status createdAt"),
        Dispute.find({ createdAt: { $gte: startDate } }).select("reason status createdAt"),
      ]);

      const csvData = {
        users: users.map(u => ({
          Name: u.fullName,
          Email: u.email,
          Role: u.role,
          "Created At": u.createdAt,
        })),
        projects: projects.map(p => ({
          Title: p.title,
          Status: p.status,
          Budget: p.budget,
          "Created At": p.createdAt,
        })),
        payments: payments.map(p => ({
          Amount: p.amount,
          Status: p.status,
          "Created At": p.createdAt,
        })),
        disputes: disputes.map(d => ({
          Reason: d.reason,
          Status: d.status,
          "Created At": d.createdAt,
        })),
      };

      // Create combined CSV with section headers
      const parser = new Parser();
      let csvContent = "=== USERS ===\n" + parser.parse(csvData.users) + "\n\n";
      csvContent += "=== PROJECTS ===\n" + parser.parse(csvData.projects) + "\n\n";
      csvContent += "=== PAYMENTS ===\n" + parser.parse(csvData.payments) + "\n\n";
      csvContent += "=== DISPUTES ===\n" + parser.parse(csvData.disputes);

      // Set headers for CSV download
      res.header("Content-Type", "text/csv");
      res.attachment(`analytics_report_${range}_${new Date().toISOString().split("T")[0]}.csv`);
      return res.send(csvContent);
    } catch (err) {
      winston.error("Export CSV Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = ApiAnalyticsController;
