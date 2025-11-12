

// app/controllers/api/ApiAdminController.js

const User = require("../../models/User");
const winston = require("../../config/winston");
const EmailService = require("../../services/email.service");

class ApiAdminController {

  /** ✅ Dashboard Summary */
  static async getDashboardStats(req, res) {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ status: "active" });
      const suspendedUsers = await User.countDocuments({ status: "suspended" });
      const pendingUsers = await User.countDocuments({ isVerified: false });
      const verifiedUsers = await User.countDocuments({ isVerified: true });

      return res.json({
        message: "Dashboard stats fetched",
        stats: {
          totalUsers,
          activeUsers,
          suspendedUsers,
          pendingUsers,
          verifiedUsers,
        },
      });
    } catch (err) {
      winston.error("Dashboard Stats Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /** ✅ Get Pending Registrations (unverified users) */
  static async getPendingUsers(req, res) {
    try {
      const users = await User.find({ isVerified: false });
      return res.json({ message: "Pending users fetched", users });
    } catch (err) {
      winston.error("GetPendingUsers Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /** ✅ Approve / Reject User */
  static async verifyUser(req, res) {
    try {
      const { userId, action } = req.body;

      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (action === "approve") {
        user.isVerified = true;

        // ✅ Send verified email
        await EmailService.sendUserVerified(user.email, user.fullName);
      } else {
        user.isVerified = false;
      }

      await user.save();

      return res.json({ message: `User ${action}d successfully`, user });

    } catch (err) {
      winston.error("VerifyUser Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /** ✅ Activate User */
  static async activateUser(req, res) {
    try {
      const { userId } = req.body;

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.status = "active";
      await user.save();

      return res.json({ message: "User activated", user });

    } catch (err) {
      winston.error("ActivateUser Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /** ✅ Update Role */
  static async updateUserRole(req, res) {
    try {
      const { userId, role } = req.body;

      if (!["admin", "freelancer", "client"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.role = role;
      await user.save();

      return res.json({ message: "Role updated", user });

    } catch (err) {
      winston.error("UpdateRole Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /** ✅ Suspend User */
  static async suspendUser(req, res) {
    try {
      const { userId } = req.body;

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.status = "suspended";
      await user.save();

      return res.json({ message: "User suspended", user });

    } catch (err) {
      winston.error("SuspendUser Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /** ✅ Reset Password */
  static async resetPassword(req, res) {
    try {
      const { userId, newPassword } = req.body;

      if (!newPassword)
        return res.status(400).json({ message: "New password required" });

      const bcrypt = require("bcryptjs");
      const hashed = await bcrypt.hash(newPassword, 10);

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.password = hashed;
      await user.save();

      return res.json({ message: "Password reset successfully" });

    } catch (err) {
      winston.error("ResetPassword Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /** ✅ Delete User */
  static async deleteUser(req, res) {
    try {
      const { userId } = req.body;

      const data = await User.findByIdAndDelete(userId);
      if (!data) return res.status(404).json({ message: "User not found" });

      return res.json({
        message: "User deleted successfully",
        deletedUser: data,
      });

    } catch (err) {
      winston.error("DeleteUser Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /** ✅ Read Logs */
  static async getLogs(req, res) {
    try {
      const fs = require("fs");
      const logPath = "logs/combined.log";

      if (!fs.existsSync(logPath)) {
        return res.json({ message: "No logs found", logs: [] });
      }

      const logs = fs.readFileSync(logPath, "utf8");
      return res.json({
        message: "Logs loaded",
        logs: logs.split("\n"),
      });

    } catch (err) {
      winston.error("GetLogs Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = ApiAdminController;
