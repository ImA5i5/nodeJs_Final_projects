const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  balance: { type: Number, default: 0 },
  transactions: [{
    type: { type: String, enum: ["credit", "debit", "refund"], required: true },
    amount: Number,
    reference: String,
    createdAt: { type: Date, default: Date.now },
  }]
}, { timestamps: true });

module.exports = mongoose.model("Wallet", walletSchema);
