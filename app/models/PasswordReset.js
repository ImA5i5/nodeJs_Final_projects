// app/models/PasswordReset.js
const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash: { type: String, required: true }, // hashed token
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("PasswordReset", passwordResetSchema);
