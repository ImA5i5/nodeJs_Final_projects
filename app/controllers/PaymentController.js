// app/controllers/PaymentController.js

const RazorpayService = require("../services/RazorpayService");
const PaymentService = require("../services/PaymentService");
const Payment = require("../models/Payment");
const Milestone = require("../models/Milestone");

class PaymentController {

  /* --------------------------------------------------------
     ✅ STEP 1 — CLIENT: Create Razorpay Order for Funding
  -------------------------------------------------------- */
  static async createOrder(req, res) {
    try {
      const { milestoneId, amount } = req.body;

      const order = await RazorpayService.createOrder(
        amount,
        `milestone_${milestoneId}`
      );

      // Store pending payment entry
      await Payment.create({
        milestone: milestoneId,
        client: req.user._id,
        amount,
        status: "pending",
      });

      return res.json({ success: true, order });

    } catch (err) {
      console.error("Create Order Error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* --------------------------------------------------------
     ✅ STEP 2 — CLIENT: Verify Razorpay Payment Signature
  -------------------------------------------------------- */
  static async verify(req, res) {
    try {
      const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        milestoneId,
        amount,
      } = req.body;

      // Verify using HMAC
      const isValid = RazorpayService.verifyPaymentSignature({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
      });

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid signature. Payment verification failed."
        });
      }

      // Move to ESCROW
      await PaymentService.fundEscrow(
        req.user,
        milestoneId,
        amount,
        razorpay_payment_id
      );

      return res.json({ success: true, message: "Milestone funded successfully" });

    } catch (err) {
      console.error("Payment Verify Error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* --------------------------------------------------------
     ✅ STEP 3 — CLIENT: Release Payment for milestone
     (Used only when passing body parameters)
  -------------------------------------------------------- */
  static async release(req, res) {
    try {
      const { milestoneId, freelancerId, amount } = req.body;

      await PaymentService.releasePayment(
        req.user,
        freelancerId,
        milestoneId,
        amount
      );

      return res.json({ success: true, message: "Payment released successfully" });

    } catch (err) {
      console.error("Release Error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* --------------------------------------------------------
     ✅ STEP 4 — CLIENT: Release milestone by URL param
     (Recommended Flow)
  -------------------------------------------------------- */
  /**
 * ✅ Release milestone payment (Client → Freelancer)
 */
static async releaseMilestone(req, res) {
  try {
    const milestoneId = req.params.id;

    const milestone = await Milestone.findById(milestoneId)
      .populate("client freelancer project");

    if (!milestone)
      return res.status(404).json({ success: false, message: "Milestone not found" });

    // ✅ Only client can release
    if (milestone.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // ✅ Valid release states
    if (!["submitted", "under-review"].includes(milestone.status)) {
      return res.status(400).json({
        success: false,
        message: "Milestone not ready for release"
      });
    }

    // ✅ CALL THE CORRECT LOGIC HERE
    await PaymentService.releasePayment(
      req.user,                  // client
      milestone.freelancer._id,  // freelancer
      milestone._id,             // milestone
      milestone.amount           // amount
    );

    return res.json({
      success: true,
      message: "✅ Payment released successfully"
    });

  } catch (err) {
    console.error("Release Payment Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}


}

module.exports = PaymentController;
