// app/controllers/AdminPaymentController.js
const WalletService = require("../services/WalletService");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const EmailService = require("../services/email.service");

class AdminPaymentController {
  // ✅ Admin transaction list
  static async allTransactions(req, res) {
    const transactions = await Transaction.find()
      .populate("freelancer client milestone")
      .sort({ createdAt: -1 });

    res.render("pages/admin/payments", {
      layout: "layouts/admin-layout",
      transactions
    });
  }

  // ✅ Admin: payout to freelancer
  static async payout(req, res) {
  try {
    const { freelancerId, amount } = req.body;

    await WalletService.debit(
      freelancerId,
      amount,
      "Admin Payout Processed"
    );

    const freelancer = await User.findById(freelancerId);

    EmailService.sendNotification(
      freelancer.email,
      "💸 Payout Completed",
      `A payout of ₹${amount} has been processed.`
    );

    res.json({ success: true, message: "Payout processed" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
}


  // ✅ Admin: view all projects + statuses
  static async projectMonitor(req, res) {
    res.render("pages/admin/project-monitor", {
      layout: "layouts/admin-layout"
    });
  }
}

module.exports = AdminPaymentController;
