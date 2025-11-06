// app/models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "in-escrow", "released", "refunded"],
      default: "pending",
    },
    transactionId: { type: String },
    paymentMethod: { type: String, enum: ["razorpay", "paypal", "bank"], default: "razorpay" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
