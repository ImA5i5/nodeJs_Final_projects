// app/models/Project.js
const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },

    subcategory: {
      type: String, // or ObjectId if you store subcategories as documents
      trim: true,
    },

    budget: {
      type: Number,
      required: true,
      min: 1,
    },

    duration: {
      type: String,
      trim: true,
    },

    attachments: [
      {
        type: String, // stores file URLs
        trim: true,
      },
    ],

    paymentType: {
      type: String,
      enum: ["fixed", "hourly"],
      default: "fixed",
    },

    hiredFreelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    status: {
  type: String,
  enum: ["pending", "approved", "assigned", "in-progress","submitted", "completed", "disputed", "rejected"],
  default: "pending",
},

    

    // 🔐 Admin moderation fields
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: {
      type: Date,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    rejectedAt: {
      type: Date,
    },

    // 👁️ Visibility toggle (soft delete support)
    isActive: {
      type: Boolean,
      default: true,
    },

    deletedAt: {
      type: Date,
    },

    // ⭐ Review flag for clients
    reviewed: {
      type: Boolean,
      default: false,
    },
    dueDate: Date,             // 🕒 project deadline
  progress: { type: Number, default: 0 }, // % completion (0–100)
  },
  { timestamps: true }
);

// ✅ Virtual for checking if project is approved
projectSchema.virtual("isApproved").get(function () {
  return this.status === "approved";
});

// ✅ Pre-save hook (auto-approve time)
projectSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "approved" && !this.approvedAt) {
    this.approvedAt = new Date();
  }
  next();
});

module.exports = mongoose.model("Project", projectSchema);
