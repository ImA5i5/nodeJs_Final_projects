// app/controllers/api/ApiAuthController.js

const User = require("../../models/User");
const Otp = require("../../models/Otp");
const bcrypt = require("bcryptjs");
const JwtService = require("../../services/jwt.service");
const transporter = require("../../config/mailer");
const jwt = require("jsonwebtoken");
const winston = require("../../config/winston");

const ALLOWED_ROLES = ["admin", "freelancer", "client"];

class ApiAuthController {
  /**
   * ✅ STEP 1 — Send OTP for signup
   */
  static async sendSignupOtp(req, res) {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!["admin", "freelancer", "client"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ OTP Generate
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // ✅ IMPORTANT: save signupData in Mongo
    await Otp.create({
      email,
      otp,
      expiresAt,
      signupData: {
        fullName,
        password: hashedPassword,
        role
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify your account",
      html: `<h3>Your OTP is <strong>${otp}</strong></h3><p>Valid for 10 minutes.</p>`
    });

    return res.json({ message: "OTP sent successfully", email });

  } catch (error) {
    winston.error("SendSignupOtp Error: " + error.message);
    return res.status(500).json({ message: "Server error" });
  }
}


  /**
   * ✅ STEP 2 — Verify OTP and create user
   */
 static async verifySignupOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email & OTP are required" });
    }

    // ✅ Fetch ONLY OTP that contains signupData
    const record = await Otp.findOne({
      email,
      "signupData.fullName": { $exists: true }
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(400).json({
        message: "Signup data missing. Please restart signup.",
      });
    }

    if (record.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const { fullName, password, role } = record.signupData;

    // ✅ Safety validation
    if (!fullName || !password || !role) {
      return res.status(400).json({
        message: "Incomplete signup data. Restart signup.",
      });
    }

    const newUser = await User.create({
      fullName,
      email,
      password,
      role,
      isVerified: true,
    });

    await Otp.deleteMany({ email });

    return res.status(201).json({
      message: "Signup successful",
      userId: newUser._id,
      role: newUser.role,
    });

  } catch (error) {
    winston.error("VerifySignupOtp Error: " + error.message);
    return res.status(500).json({ message: "Server error" });
  }
}


  /**
   * ✅ STEP 3 — Login (JWT)
   */
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email & password are required" });
      }

      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      if (!user.isVerified) {
        return res.status(401).json({ message: "Email not verified" });
      }

      if (user.status === "suspended") {
        return res.status(403).json({ message: "Your account is suspended" });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      // Generate tokens
      const { accessToken, refreshToken } = await JwtService.generateTokens(user._id);

      // Save refresh token
      user.refreshToken = refreshToken;
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      return res.json({
        message: "Login successful",
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        }
      });

    } catch (err) {
      winston.error("Login Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ Refresh Token
   */
  static async refreshToken(req, res) {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ message: "Refresh token required" });

      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || user.refreshToken !== token) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }

      const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
      });

      return res.json({ accessToken });

    } catch (err) {
      winston.error("RefreshToken Error: " + err.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  }

  /**
   * ✅ Logout
   */
static async logout(req, res) {
  try {
    // ✅ Handle cases where req.body may be undefined
    const body = req.body || {};

    const refreshToken = body.refreshToken || req.headers["x-refresh-token"];

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const userId = decoded.id;

    await User.findByIdAndUpdate(userId, { refreshToken: null });

    return res.json({ message: "Logged out successfully" });

  } catch (err) {
    winston.error("Logout Error: " + err.message);
    return res.status(500).json({ message: "Server error" });
  }
}


}

module.exports = ApiAuthController;
