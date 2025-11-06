// app/controllers/AuthController.js
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Otp = require("../models/Otp");
const transporter = require("../config/mailer");
const JwtService = require("../services/jwt.service");

class AuthController {
  // Render Register Page
  static getRegister(req, res) {
    res.render("pages/auth/register", {
      title: "Register",
      layout: "layouts/main",
    });
  }

  // Step 1: Register → Send OTP
  static async register(req, res, next) {
    try {
      const { fullName, email, password, role } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        req.flash("error", "Email already registered.");
        return res.redirect("/auth/register");
      }

      // Hash password before storing temporarily
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await Otp.create({ email, otp, expiresAt });

      // Send email
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Verify your account",
        html: `<h3>Your OTP is <strong>${otp}</strong></h3><p>Valid for 10 minutes.</p>`,
      });

      // Store data temporarily in session (not URL)
      req.session.tempUser = { fullName, email, password: hashedPassword, role };

      req.flash("success", "OTP sent to your email!");
      return res.redirect("/auth/verify-otp");
    } catch (err) {
      next(err);
    }
  }

  // Step 2: Verify OTP
  static getOtpPage(req, res) {
    const { tempUser } = req.session;
    if (!tempUser) {
      req.flash("error", "Session expired. Please register again.");
      return res.redirect("/auth/register");
    }
    res.render("pages/auth/otp-verify", {
      title: "Verify OTP",
      layout: "layouts/main",
      email: tempUser.email,
    });
  }

  static async verifyOtp(req, res, next) {
    try {
      const { otp } = req.body;
      const { tempUser } = req.session;

      if (!tempUser) {
        req.flash("error", "Session expired. Please register again.");
        return res.redirect("/auth/register");
      }

      const record = await Otp.findOne({ email: tempUser.email, otp });
      if (!record || record.expiresAt < Date.now()) {
        req.flash("error", "Invalid or expired OTP.");
        return res.redirect("/auth/verify-otp");
      }

      // Create user
      await User.create({
        fullName: tempUser.fullName,
        email: tempUser.email,
        password: tempUser.password,
        role: tempUser.role,
        isVerified: true,
      });

      // Cleanup
      await Otp.deleteMany({ email: tempUser.email });
      delete req.session.tempUser;

      req.flash("success", "Account verified successfully! You can now log in.");
      res.redirect("/auth/login");
    } catch (err) {
      next(err);
    }
  }

  // Step 3: Login Page
  static getLogin(req, res) {
    res.render("pages/auth/login", {
      title: "Login",
      layout: "layouts/main",
    });
  }

  // Step 4: Handle Login
 static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // 🔹 Validate input
      if (!email || !password) {
        req.flash("error", "Please enter both email and password.");
        return res.redirect("/auth/login");
      }

      // 🔹 Find user by email
      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        req.flash("error", "Invalid email or password.");
        return res.redirect("/auth/login");
      }

      // 🔹 Check status
      if (user.status === "suspended") {
        req.flash("error", "Your account has been suspended. Please contact support.");
        return res.redirect("/auth/login");
      }

      // 🔹 Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        req.flash("error", "Invalid email or password.");
        return res.redirect("/auth/login");
      }

      // 🔹 Check verification
      if (!user.isVerified) {
        req.flash("error", "Please verify your email before logging in.");
        return res.redirect("/auth/login");
      }

      // ✅ Generate tokens (Access + Refresh)
      const { accessToken, refreshToken } = await JwtService.generateTokens(user._id);

      // ✅ Store cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // ✅ Update last login
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      // ✅ Flash message
      req.flash("success", `Welcome back, ${user.fullName.split(" ")[0]}!`);

      // ✅ Redirect by role
      switch (user.role) {
        case "admin":
          return res.redirect("/admin/dashboard");
        case "freelancer":
          return res.redirect("/freelancer/dashboard");
        default:
          return res.redirect("/client/dashboard");
      }
    } catch (err) {
      console.error("❌ Login Error:", err);
      req.flash("error", "Something went wrong during login. Please try again.");
      return res.redirect("/auth/login");
    }
  }


  // Step 5: Logout
  static logout(req, res) {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      req.flash("success", "Logged out successfully.");
      res.redirect("/auth/login");
    });
  }
}

module.exports = AuthController;
