// app/controllers/AnalyticsController.js
const mongoose = require("mongoose");
const User = require("../models/User");
const Project = require("../models/Project");
const Payment = require("../models/Payment");
const Dispute = require("../models/Dispute");
const winston = require("../config/winston");
const { Parser } = require("json2csv");

class AnalyticsController {
  /**
   * 📊 MAIN DASHBOARD ANALYTICS (Reports View)
   * - Displays overall metrics & charts
   */
  static async getStats(req, res, next) {
    try {
      const [userCount, projectCount, totalDisputes, revenueData] = await Promise.all([
        User.countDocuments(),
        Project.countDocuments(),
        Dispute.countDocuments(),
        Payment.aggregate([
          { $match: { status: "released" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
      ]);

      const totalRevenue = revenueData[0]?.total || 0;

      // 📈 Monthly user growth
      const userGrowth = await User.aggregate([
        {
          $group: {
            _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
            total: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      // 📈 Monthly revenue trend
      const revenueTrend = await Payment.aggregate([
        { $match: { status: "released" } },
        {
          $group: {
            _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      res.render("pages/admin/reports", {
        layout: "layouts/admin-layout",
        title: "Analytics Dashboard",
        userCount,
        projectCount,
        totalDisputes,
        totalRevenue,
        userGrowth,
        revenueTrend,
      });
    } catch (err) {
      winston.error("Analytics Dashboard Error: " + err.message);
      next(err);
    }
  }

  /**
   * 🗓️ PERIODIC REPORTS (Daily, Weekly, Monthly)
   */
  static async getPeriodicReport(req, res, next) {
    try {
      const type = req.params.type || "monthly";
      const now = new Date();
      let startDate;

      if (type === "daily") startDate = new Date(now.setDate(now.getDate() - 1));
      else if (type === "weekly") startDate = new Date(now.setDate(now.getDate() - 7));
      else startDate = new Date(now.setMonth(now.getMonth() - 1));

      const payments = await Payment.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: "$status",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]);

      res.json({ success: true, type, data: payments });
    } catch (err) {
      winston.error("Periodic Report Error: " + err.message);
      next(err);
    }
  }

  /**
   * 👥 USER PERFORMANCE ANALYTICS
   * - Track new signups, active vs inactive users
   */
  static async getUserPerformance(req, res, next) {
    try {
      const [growth, statusBreakdown] = await Promise.all([
        User.aggregate([
          {
            $group: {
              _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
              total: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
        User.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

      res.json({ success: true, growth, statusBreakdown });
    } catch (err) {
      winston.error("User Performance Error: " + err.message);
      next(err);
    }
  }

  /**
   * 💼 PROJECT PERFORMANCE ANALYTICS
   * - Tracks project completion, pending, in-progress, etc.
   */
  static async getProjectPerformance(req, res, next) {
    try {
      const projectStats = await Project.aggregate([
        { $group: { _id: "$status", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);

      const categoryBreakdown = await Project.aggregate([
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        { $unwind: "$category" },
        { $group: { _id: "$category.name", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]);

      res.json({ success: true, projectStats, categoryBreakdown });
    } catch (err) {
      winston.error("Project Performance Error: " + err.message);
      next(err);
    }
  }

  /**
   * 🏆 TOP PERFORMERS (Freelancers & Clients)
   * - Shows highest earners and top spenders
   */
  static async getTopPerformers(req, res, next) {
    try {
      const topFreelancers = await Payment.aggregate([
        { $match: { status: "released" } },
        {
          $group: {
            _id: "$freelancer",
            totalEarnings: { $sum: "$amount" },
            projects: { $sum: 1 },
          },
        },
        { $sort: { totalEarnings: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "freelancer",
          },
        },
        { $unwind: "$freelancer" },
        {
          $project: {
            name: "$freelancer.fullName",
            totalEarnings: 1,
            projects: 1,
          },
        },
      ]);

      const topClients = await Payment.aggregate([
        { $match: { status: "released" } },
        {
          $group: {
            _id: "$client",
            totalSpent: { $sum: "$amount" },
            projects: { $sum: 1 },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $project: {
            name: "$client.fullName",
            totalSpent: 1,
            projects: 1,
          },
        },
      ]);

      res.json({ success: true, topFreelancers, topClients });
    } catch (err) {
      winston.error("Top Performers Error: " + err.message);
      next(err);
    }
  }

  /**
   * 📤 EXPORT REPORT (CSV / JSON)
   * - Admin can export all analytics data for backup or analysis
   */
  static async exportReport(req, res, next) {
    try {
      const format = req.params.format || "json";

      const payments = await Payment.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $lookup: {
            from: "users",
            localField: "freelancer",
            foreignField: "_id",
            as: "freelancer",
          },
        },
        { $unwind: "$freelancer" },
        {
          $lookup: {
            from: "projects",
            localField: "project",
            foreignField: "_id",
            as: "project",
          },
        },
        { $unwind: "$project" },
        {
          $project: {
            project: "$project.title",
            client: "$client.fullName",
            freelancer: "$freelancer.fullName",
            amount: 1,
            status: 1,
            paymentMethod: 1,
            createdAt: 1,
          },
        },
      ]);

      if (format === "csv") {
        const fields = ["project", "client", "freelancer", "amount", "status", "paymentMethod", "createdAt"];
        const parser = new Parser({ fields });
        const csv = parser.parse(payments);

        res.header("Content-Type", "text/csv");
        res.attachment("analytics-report.csv");
        return res.send(csv);
      }

      res.json({ success: true, count: payments.length, data: payments });
    } catch (err) {
      winston.error("Export Report Error: " + err.message);
      next(err);
    }
  }
}

module.exports = AnalyticsController;
