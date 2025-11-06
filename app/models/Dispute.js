// app/models/Dispute.js
const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["open", "in-review", "resolved", "rejected"],
      default: "open",
    },
    resolution: { type: String },
    // 🧾 Keep record of all dispute actions
    history: [
      {
        action: { type: String },
        message: { type: String },
        actor: { type: String }, // "admin", "client", or "freelancer"
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dispute", disputeSchema);
