// app/models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "freelancer", "client"],
      default: "client",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    profile: {
      bio: { type: String, trim: true },
      skills: [{ type: String, trim: true }],
      experience: { type: Number, min: 0 },
      hourlyRate: { type: Number, min: 0 },
      profilePic: String,
      portfolio: [String],
      rating: { type: Number, default: 0, min: 0, max: 5 },
      totalReviews: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    refreshToken: { type: String },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// ✅ Hash password before saving to DB
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  // avoid double-hashing if it's already bcrypt format
  if (this.password.startsWith("$2a$") || this.password.startsWith("$2b$")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
