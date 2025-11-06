// app/services/analytics.service.js
const User = require("../models/User");
const Project = require("../models/Project");
const Payment = require("../models/Payment");

class AnalyticsService {
  static async getPlatformStats() {
    const [users, projects, payments] = await Promise.all([
      User.countDocuments(),
      Project.countDocuments(),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    return {
      totalUsers: users,
      totalProjects: projects,
      totalRevenue: payments[0]?.total || 0,
    };
  }

  static async getMonthlyRevenue() {
    const data = await Payment.aggregate([
      { $match: { status: "released" } },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    return data.map((m) => ({
      month: m._id.month,
      revenue: m.total,
    }));
  }

  static async getUserGrowth() {
    return await User.aggregate([
      { $group: { _id: { month: { $month: "$createdAt" } }, total: { $sum: 1 } } },
      { $sort: { "_id.month": 1 } },
    ]);
  }
}

module.exports = AnalyticsService;
