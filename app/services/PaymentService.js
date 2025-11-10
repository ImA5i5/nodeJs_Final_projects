// app/services/PaymentService.js
const Milestone = require("../models/Milestone");
const Payment = require("../models/Payment");
const Transaction = require("../models/Transaction");
const WalletService = require("./WalletService");
const EmailService = require("./email.service");
const mongoose = require("mongoose");

class PaymentService {
  /**
   * ✅ Escrow funding after Razorpay verification
   */
  static async fundEscrow(clientUser, milestoneId, amount, razorpayPaymentId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Mark milestone funded
      await Milestone.findByIdAndUpdate(
        milestoneId,
        { status: "funded", fundedAt: new Date() },
        { session }
      );

      // Create/Update Payment record
      await Payment.findOneAndUpdate(
        { milestone: milestoneId },
        {
          client: clientUser._id,
          amount,
          status: "funded",
          razorpayPaymentId,
        },
        { upsert: true, new: true, session }
      );

      // Record transaction
      await Transaction.create(
        [
          {
            type: "escrow_fund",
            client: clientUser._id,
            milestone: milestoneId,
            amount,
            razorpayPaymentId,
            status: "completed",
          },
        ],
        { session }
      );

      // Notify client
      await EmailService.sendEscrowFunded(
        clientUser.email,
        amount,
        `Milestone ${milestoneId}`
      );

      await session.commitTransaction();
      session.endSession();
      return { success: true };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }

  /**
   * ✅ Release payment to freelancer wallet after client approval
   */
  
static async releasePayment(clientUser, freelancerId, milestoneId, amount) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ✅ Load milestone (required to attach project + client info)
    const milestone = await Milestone.findById(milestoneId)
      .populate("project client freelancer")
      .session(session);

    if (!milestone) {
      throw new Error("Milestone not found");
    }

    // ✅ Update milestone status
    milestone.status = "released";
    milestone.releasedAt = new Date();
    await milestone.save({ session });

    // ✅ Create FULL Payment record (this is required for earnings)
    await Payment.create(
      [{
        project: milestone.project._id,
        milestone: milestone._id,
        client: milestone.client._id,
        freelancer: milestone.freelancer._id,
        amount,
        status: "released"
      }],
      { session }
    );

    // ✅ Add funds to freelancer wallet
    await WalletService.credit(
      freelancerId,
      amount,
      `Milestone ${milestoneId} released`
    );

    // ✅ Create transaction entry
    await Transaction.create(
      [{
        type: "release",
        client: clientUser._id,
        freelancer: freelancerId,
        milestone: milestoneId,
        amount,
        status: "completed"
      }],
      { session }
    );

    // ✅ Email Notification
    await EmailService.sendPaymentReleased(
      milestone.freelancer.email,
      amount,
      `Milestone ${milestoneId}`
    );

    await session.commitTransaction();
    session.endSession();
    return { success: true };

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}


  /**
   * ✅ Refund client (from dispute resolution)
   */
  static async refundToClient(clientId, milestoneId, amount, reason = "") {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update milestone
      await Milestone.findByIdAndUpdate(
        milestoneId,
        { status: "refunded" },
        { session }
      );

      // Update payment record
      await Payment.findOneAndUpdate(
        { milestone: milestoneId },
        { status: "refunded" },
        { session }
      );

      // Record transaction
      await Transaction.create(
        [
          {
            type: "refund",
            client: clientId,
            milestone: milestoneId,
            amount,
            status: "completed",
          },
        ],
        { session }
      );

      // Notify client
      await EmailService.sendNotification(
        null, // controller should pass real email
        "💸 Refund Processed",
        `Refund of ₹${amount} processed. ${reason}`
      );

      await session.commitTransaction();
      session.endSession();
      return { success: true };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  }
}

module.exports = PaymentService;
