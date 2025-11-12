// app/models/Otp.js
const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
     signupData: {
      fullName: { type: String },
      password: { type: String },
      role: {
        type: String,
        enum: ["admin", "freelancer", "client"],
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Otp", otpSchema);
