// app/controllers/AdminController.js
const Project=require("../models/Project");
const Payment=require("../models/Payment");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Otp = require("../models/Otp");
const transporter = require("../config/mailer");
const winston = require("../config/winston");
const generateEmailTemplate = require("../utils/emailTemplate");

class AdminController {
  /**
   * 📊 Admin Dashboard
   */
  static async dashboard(req, res, next) {
    try {
      const [userCount, projectCount, revenue] = await Promise.all([
        User.countDocuments(),
        Project.countDocuments(),
        Payment.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      ]);

      res.render("pages/admin/dashboard", {
        layout: "layouts/admin-layout",
        title: "Admin Dashboard",
        userCount,
        projectCount,
        revenue: revenue[0]?.total || 0,
      });
    } catch (err) {
      winston.error("Dashboard Error: " + err.message);
      next(err);
    }
  }

  /** ✅ Manage Page */
 static async manageUsers(req, res, next) {
  try {
    const { role, status, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (status) query.status = status;
    if (search)
      query.$or = [
        { fullName: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];

    const users = await User.find(query).sort({ createdAt: -1 }).lean();

    res.render("pages/admin/users", {
      layout: "layouts/admin-layout",
      title: "Manage Users",
      users,
      // ✅ Always pass a defined filters object
      filters: {
        role: role || "",
        status: status || "",
        search: search || "",
      },
      success: req.flash("success"),
      error: req.flash("error"),
      info: req.flash("info"),
    });
  } catch (err) {
    next(err);
  }
}

  /** ✅ Approve User (AJAX) */
  static async approveUserAjax(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      user.isVerified = true;
      user.status = "active";
      await user.save();

      const html = generateEmailTemplate(
        "🎉 Account Approved",
        `Hi ${user.fullName}, your account has been approved.`,
        "Login Now",
        `${process.env.BASE_URL}/auth/login`
      );

      await transporter.sendMail({
        from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "🎉 Account Approved",
        html,
      });

      res.json({ success: true, message: `User ${user.fullName} approved.` });
    } catch (err) {
      winston.error("ApproveUserAjax Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /** ⚠️ Suspend User (AJAX) */
  static async suspendUserAjax(req, res) {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, { status: "suspended" }, { new: true });
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const html = generateEmailTemplate(
        "⚠️ Account Suspended",
        `Hi ${user.fullName}, your account has been suspended. Contact support for help.`,
        "Contact Support",
        `${process.env.BASE_URL}/support`
      );
      await transporter.sendMail({
        from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "⚠️ Account Suspended",
        html,
      });

      res.json({ success: true, message: `User ${user.fullName} suspended.` });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /** 🔑 Reset Password (AJAX) */
  static async resetUserPasswordAjax(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const newPassword = Math.random().toString(36).slice(-8);
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();

      const html = generateEmailTemplate(
        "🔑 Password Reset by Admin",
        `Hi ${user.fullName}, your new temporary password is <strong>${newPassword}</strong>.`,
        "Login Now",
        `${process.env.BASE_URL}/auth/login`
      );

      await transporter.sendMail({
        from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "🔑 Password Reset by Admin",
        html,
      });

      res.json({ success: true, message: `Password reset for ${user.fullName}.` });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /** 🕵️ Verify Identity (AJAX) */
  static async triggerIdentityVerificationAjax(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      await Otp.create({ email: user.email, otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) });

      const html = generateEmailTemplate(
        "🕵️ Identity Verification Required",
        `Hi ${user.fullName}, your OTP is <strong>${otp}</strong>. It expires in 10 minutes.`,
        "Verify Now",
        `${process.env.BASE_URL}/auth/verify-otp?email=${user.email}`
      );

      await transporter.sendMail({
        from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "🕵️ Verify Your Identity",
        html,
      });

      res.json({ success: true, message: `Identity verification sent to ${user.email}.` });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /** 🗑️ Delete User (AJAX) */
  static async deleteUserAjax(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      await user.deleteOne();
      res.json({ success: true, message: `User ${user.fullName} deleted.` });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /** 📧 Manual Verify by Email (AJAX) */
  static async verifyUserByEmailAjax(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ success: false, message: "No user with that email." });

      user.isVerified = true;
      user.status = "active";
      await user.save();

      res.json({ success: true, message: `User ${user.fullName} verified by email.` });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

module.exports = AdminController;
