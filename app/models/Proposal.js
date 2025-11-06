const mongoose = require("mongoose");

const proposalSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bidAmount: { type: Number, required: true },
  estimatedDuration: { type: String, required: true },
  coverLetter: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ["pending", "shortlisted", "accepted", "rejected", "withdrawn"],
    default: "pending",
  },
}, { timestamps: true });

module.exports = mongoose.model("Proposal", proposalSchema);
