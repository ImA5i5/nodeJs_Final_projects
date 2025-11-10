// app/models/Milestone.js
const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  amount: { type: Number, required: true, min: 0 },
  dueDate: { type: Date },
  attachments: [String], // deliverables (freelancer uploads)
  status: {
    type: String,
    enum: [
      "created",
      "funded",
      "in-progress",
      "submitted",
      "under-review",
      "released",
      "revision-requested",
      "completed",
      "disputed"
    ],
    default: "created"
  },
  deliverables: [String], // urls
  notes: String,
  escrowPaymentId: String,  // your Payment doc id / Razorpay order id
  releasedAt: Date,
  progress: { type: Number, default: 0 }, // individual milestone progress
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // client who created
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
   // audit
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date, // freelancer (project.hiredFreelancer)
}, { timestamps: true });

module.exports = mongoose.model("Milestone", milestoneSchema);
