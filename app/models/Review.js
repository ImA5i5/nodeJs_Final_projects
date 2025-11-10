const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    rating: { type: Number, min: 1, max: 5, required: true },
    feedback: { type: String, required: true },
    tags: [{ type: String }],

    reply: { type: String, default: null }, // ✅ Freelancer reply
    repliedAt: { type: Date },

    removed: { type: Boolean, default: false }, // ✅ Admin moderation
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
