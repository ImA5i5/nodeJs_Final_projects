const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ["escrow_fund", "release", "refund", "payout"], required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  milestone: { type: mongoose.Schema.Types.ObjectId, ref: "Milestone" },
  amount: Number,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", transactionSchema);
