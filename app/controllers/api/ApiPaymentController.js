// app/controllers/api/ApiPaymentController.js

const RazorpayService = require("../../services/RazorpayService");
const PaymentService = require("../../services/PaymentService");
const WalletService = require("../../services/WalletService");
const EmailService = require("../../services/email.service");
const Payment = require("../../models/Payment");
const Milestone = require("../../models/Milestone");
const Dispute = require("../../models/Dispute");
const winston = require("../../config/winston");

class ApiPaymentController {
  /**
   * ✅ Step 1 — Client creates Razorpay order for milestone funding
   * POST /api/payment/create-order
   */
  static async createOrder(req, res) {
    try {
      const { milestoneId, amount } = req.body;
      if (!milestoneId || !amount)
        return res.status(400).json({ message: "milestoneId and amount required" });

      // create Razorpay order
      const order = await RazorpayService.createOrder(amount, milestoneId, {
        type: "milestone_fund",
      });

      winston.info(`🧾 Razorpay Order for milestone ${milestoneId} created by client`);
      return res.json({
        message: "Razorpay order created successfully",
        order,
      });
    } catch (err) {
      winston.error("❌ Create Razorpay Order Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ Step 2 — Verify Razorpay payment after checkout success
   * POST /api/payment/verify
   */
  static async verifyPayment(req, res) {
    try {
      const { orderId, paymentId, signature, milestoneId, amount } = req.body;
      const clientUser = req.user;

      if (!orderId || !paymentId || !signature)
        return res.status(400).json({ message: "Missing Razorpay fields" });

      const valid = RazorpayService.verifyPaymentSignature({
        orderId,
        paymentId,
        signature,
      });

      if (!valid)
        return res.status(400).json({ message: "Invalid payment signature" });

      // mark milestone as funded and record payment
      await PaymentService.fundEscrow(clientUser, milestoneId, amount, paymentId);

      // 🔔 Notify both parties
      const milestone = await Milestone.findById(milestoneId).populate("freelancer");
      await EmailService.sendNotification(
        milestone.freelancer.email,
        "💰 Milestone Funded",
        `Client has funded milestone <b>${milestone.title}</b>. Work can now begin.`
      );

      return res.json({
        message: "Payment verified and escrow funded successfully",
        milestoneId,
      });
    } catch (err) {
      winston.error("❌ Verify Payment Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ Step 3 — Client releases milestone payment to freelancer
   * PATCH /api/payment/milestone/:id/release
   */
  static async releaseMilestone(req, res) {
    try {
      const { id } = req.params;
      const clientUser = req.user;

      const milestone = await Milestone.findById(id).populate("freelancer client project");
      if (!milestone) return res.status(404).json({ message: "Milestone not found" });

      if (milestone.client._id.toString() !== clientUser._id.toString())
        return res.status(403).json({ message: "Unauthorized" });

      if (!["submitted", "under-review"].includes(milestone.status)) {
        return res
          .status(400)
          .json({ message: "Milestone must be submitted or under review to release" });
      }

      // release payment (to wallet + record transaction)
      await PaymentService.releasePayment(
        clientUser,
        milestone.freelancer._id,
        milestone._id,
        milestone.amount
      );

      // ✅ Notify freelancer via email
      await EmailService.sendPaymentReleased(
        milestone.freelancer.email,
        milestone.amount,
        milestone.title
      );

      winston.info(`✅ Payment released for milestone ${id} by ${clientUser.email}`);

      return res.json({ message: "Milestone payment released successfully" });
    } catch (err) {
      winston.error("❌ Release Milestone Payment Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ Step 4 — Admin refunds client (dispute or failure)
   * PATCH /api/payment/:id/refund
   */
   
  static async refundPayment(req, res) {
    try {
      const { id } = req.params; // milestoneId

      // Safely handle missing body
      const body = req.body || {};
      const amount = body.amount;
      const reason = body.reason || "No reason provided";

      // Basic validation
      if (amount === undefined || amount === null) {
        return res.status(400).json({ message: "amount is required in request body" });
      }
      if (isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ message: "amount must be a positive number" });
      }

      const milestone = await Milestone.findById(id).populate("client freelancer");
      if (!milestone) return res.status(404).json({ message: "Milestone not found" });

      // Call payment service
      await PaymentService.refundToClient(milestone.client._id, milestone._id, Number(amount), reason);

      // Notify both parties
      await EmailService.sendNotification(
        milestone.client.email,
        "💸 Refund Processed",
        `<p>Your refund for milestone <b>${milestone.title}</b> has been processed.</p><p>Reason: ${reason}</p>`
      );
      await EmailService.sendNotification(
        milestone.freelancer.email,
        "⚠️ Refund Issued",
        `<p>Admin has processed a refund for milestone <b>${milestone.title}</b>.</p><p>Reason: ${reason}</p>`
      );

      winston.info(`💸 Refund processed for milestone ${id} amount=${amount}`);

      return res.json({ message: "Refund processed successfully" });
    } catch (err) {
      // Log the incoming body for easier debugging
      winston.error("❌ Refund Payment Error: " + err.message + " | body: " + JSON.stringify(req.body));
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ Step 5 — Freelancer views wallet balance
   * GET /api/payment/wallet
   */
  static async getWalletBalance(req, res) {
    try {
      const userId = req.user._id;
      const wallet = await WalletService.getWallet(userId);

      return res.json({
        balance: wallet.balance,
        transactions: wallet.transactions.slice(-10).reverse(),
      });
    } catch (err) {
      winston.error("❌ Get Wallet Balance Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ Step 6 — Dispute Escalation (Client or Freelancer)
   * POST /api/payment/dispute
   */
  static async raiseDispute(req, res) {
    try {
      const { milestoneId, reason, description } = req.body;
      const user = req.user;

      const milestone = await Milestone.findById(milestoneId).populate("project client freelancer");
      if (!milestone) return res.status(404).json({ message: "Milestone not found" });

      const dispute = await Dispute.create({
        project: milestone.project._id,
        milestone: milestone._id,
        raisedBy: user._id,
        client: milestone.client._id,
        freelancer: milestone.freelancer._id,
        reason,
        description,
        status: "open",
      });

      milestone.status = "disputed";
      await milestone.save();

      await EmailService.sendNotification(
        milestone.client.email,
        "⚠️ Dispute Raised",
        `A dispute was raised for milestone <b>${milestone.title}</b>.<br>Reason: ${reason}`
      );
      await EmailService.sendNotification(
        milestone.freelancer.email,
        "⚠️ Dispute Raised",
        `A dispute was raised for milestone <b>${milestone.title}</b>.<br>Reason: ${reason}`
      );

      winston.info(`🚨 Dispute raised for milestone ${milestoneId}`);

      return res.status(201).json({
        message: "Dispute raised successfully",
        dispute,
      });
    } catch (err) {
      winston.error("❌ Raise Dispute Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ Step 7 — View all payment records (client/freelancer)
   * GET /api/payment/history
   */
  static async getPaymentHistory(req, res) {
    try {
      const userId = req.user._id;

      const payments = await Payment.find({
        $or: [{ client: userId }, { freelancer: userId }],
      })
        .populate("project milestone", "title amount status")
        .sort({ createdAt: -1 });

      return res.json({ payments });
    } catch (err) {
      winston.error("❌ Get Payment History Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = ApiPaymentController;
