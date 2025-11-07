const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
  milestone: { type: mongoose.Schema.Types.ObjectId, ref: "Milestone" },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "funded", "released", "completed", "refunded"], default: "pending" },
  razorpayPaymentId: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Payment", paymentSchema);
