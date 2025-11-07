// app/controllers/WalletController.js
const WalletService = require("../services/WalletService");
const Transaction = require("../models/Transaction");

class WalletController {
  // ✅ Freelancer Wallet Page
  static async getEarnings(req, res) {
    try {
      const wallet = await WalletService.getWallet(req.user._id);

      const transactions = await Transaction.find({
        freelancer: req.user._id,
      }).sort({ createdAt: -1 });

      res.render("pages/freelancer/earnings", {
        layout: "layouts/freelancer-layout",
        wallet,
        transactions
      });
    } catch (err) {
      res.status(500).send("Server Error");
    }
  }

  static async requestWithdraw(req, res) {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.json({ success: false, message: "Invalid amount" });
    }

    const wallet = await WalletService.getWallet(req.user._id);

    if (wallet.balance < amount) {
      return res.json({ success: false, message: "Insufficient balance" });
    }

    // Here you can notify admin or create payout-request
    await WalletService.debit(req.user._id, amount, "Withdrawal Request");

    return res.json({
      success: true,
      message: "Withdrawal request submitted! Admin will review it shortly.",
    });
  } catch (err) {
    return res.json({ success: false, message: err.message });
  }
}

}

module.exports = WalletController;
