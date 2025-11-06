// app/models/Bid.js
const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bidAmount: { type: Number, required: true },
    deliveryTime: { type: String, required: true },
    coverLetter: { type: String },
   status: {
  type: String,
  enum: ["pending", "reviewed", "accepted", "rejected"],
  default: "pending",
},
  },
  { timestamps: true }
);

bidSchema.index({ project: 1, freelancer: 1 }, { unique: true }); // Prevent duplicate bids

module.exports = mongoose.model("Bid", bidSchema);
