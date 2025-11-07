// app/services/RazorpayService.js
const Razorpay = require("razorpay");
const crypto = require("crypto");
const winston = require("../config/winston");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

class RazorpayService {
  /**
   * ✅ Create a Razorpay Order for escrow funding
   * @param {number} amountInINR - amount in rupees
   * @param {string} receiptId - unique reference (milestoneId / projectId)
   */
  static async createOrder(amountInINR, receiptId, notes = {}) {
    try {
      const order = await razorpay.orders.create({
        amount: Math.round(amountInINR * 100), // convert to paise
        currency: "INR",
        receipt: receiptId,
        payment_capture: 1,
        notes,
      });

      winston.info(`✅ Razorpay Order created: ${order.id}`);
      return order;
    } catch (err) {
      winston.error("❌ Razorpay Order Error: " + err.message);
      throw new Error("Failed to create Razorpay order");
    }
  }

  /**
   * ✅ Verify checkout signature after successful payment
   */
  static verifyPaymentSignature({ orderId, paymentId, signature }) {
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    return expectedSignature === signature;
  }

  /**
   * ✅ Verify webhook signature (safer because Razorpay sends raw body)
   */
  static verifyWebhookSignature(rawBody, receivedSignature) {
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    return expected === receivedSignature;
  }
}

module.exports = RazorpayService;
