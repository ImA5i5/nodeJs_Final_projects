// app/controllers/PaymentController.js
const RazorpayService = require("../services/RazorpayService");
const PaymentService = require("../services/PaymentService");
const Payment = require("../models/Payment");
const Milestone = require("../models/Milestone");

class PaymentController {
  // ✅ Step 1: Create Razorpay Order
  static async createOrder(req, res) {
    try {
      const { milestoneId, amount } = req.body;

      const order = await RazorpayService.createOrder(
        amount,
        `milestone_${milestoneId}`
      );

      await Payment.create({
        milestone: milestoneId,
        client: req.user._id,
        amount,
        status: "pending",
      });

      res.json({ success: true, order });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ✅ Step 2: Verify Razorpay Payment
  static async verify(req, res) {
    try {
      const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        milestoneId,
        amount
      } = req.body;

      const isValid = RazorpayService.verifyPaymentSignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature
      });

      if (!isValid)
        return res.status(400).json({ success: false, message: "Signature mismatch" });

      await PaymentService.fundEscrow(
        req.user,
        milestoneId,
        amount,
        razorpay_payment_id
      );

      res.json({ success: true, message: "Milestone funded successfully" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ✅ Step 3: Client Releases Payment
  static async release(req, res) {
    try {
      const { milestoneId, freelancerId, amount } = req.body;

      await PaymentService.releasePayment(
        req.user,
        freelancerId,
        milestoneId,
        amount
      );

      res.json({ success: true, message: "Payment released successfully" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = PaymentController;
