// app/controllers/AuthController.js
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Otp = require("../models/Otp");
const transporter = require("../config/mailer");
const JwtService = require("../services/jwt.service");
const crypto = require("crypto");
const PasswordReset = require("../models/PasswordReset");
const EmailService = require("../services/email.service");

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


  // Render Forgot Password Page
static getForgot(req, res) {
  res.render("pages/auth/forgot", {
    title: "Forgot Password",
    layout: "layouts/main",
  });
}

// Handle Forgot Password (send email)
static async postForgot(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      req.flash("error", "Please provide your email.");
      return res.redirect("/auth/forgot");
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Do not reveal whether email exists. Show success message anyway.
      req.flash("success", "If the email exists we'll send reset instructions.");
      return res.redirect("/auth/forgot");
    }

    // create a secure token (raw token is sent in email, hashed stored)
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour

    // mark previous resets for this user used (optional)
    await PasswordReset.updateMany({ user: user._id, used: false }, { used: true });

    await PasswordReset.create({
      user: user._id,
      tokenHash,
      expiresAt,
      used: false
    });

    // Build reset URL
    const resetUrl = `${process.env.BASE_URL || ""}/auth/reset/${token}`;

    // Email content (use EmailService)
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height:1.4;">
        <h2 style="color:#0f5132">Reset your password</h2>
        <p>Hi ${user.fullName.split(" ")[0] || ""},</p>
        <p>We received a request to reset your password for your account at <strong>Freelancer Marketplace</strong>.</p>
        <p style="margin: 16px 0;">
          <a href="${resetUrl}" style="display:inline-block;padding:10px 18px;background:#16a34a;color:#fff;border-radius:6px;text-decoration:none;">
            Reset Password
          </a>
        </p>
        <p>If the button doesn't work, copy & paste this link into your browser:</p>
        <p style="font-size:13px;color:#555">${resetUrl}</p>
        <p style="color:#888;font-size:13px;margin-top:10px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    await EmailService.sendNotification(user.email, "Reset your password — Freelancer Marketplace", html);

    req.flash("success", "If the email exists we'll send reset instructions.");
    return res.redirect("/auth/forgot");

  } catch (err) {
    next(err);
  }
}


// Render Reset Password page (token in URL)
static async getReset(req, res, next) {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).render("pages/auth/forgot", { layout: "layouts/main", message: "Invalid reset link." });

    // find matching PasswordReset by hashed token and not expired and not used
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await PasswordReset.findOne({ tokenHash, used: false, expiresAt: { $gt: new Date() } }).populate("user");

    if (!record) {
      req.flash("error", "Reset link is invalid or expired.");
      return res.redirect("/auth/forgot");
    }

    res.render("pages/auth/reset", {
      title: "Reset Password",
      layout: "layouts/main",
      token // raw token used in POST URL
    });

  } catch (err) {
    next(err);
  }
}

// Handle actual password reset
static async postReset(req, res, next) {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    if (!password || !confirmPassword) {
      req.flash("error", "Please provide and confirm your new password.");
      return res.redirect(`/auth/reset/${token}`);
    }
    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match.");
      return res.redirect(`/auth/reset/${token}`);
    }
    // locate token record
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const record = await PasswordReset.findOne({ tokenHash, used: false, expiresAt: { $gt: new Date() } }).populate("user");

    if (!record) {
      req.flash("error", "Reset link is invalid or expired.");
      return res.redirect("/auth/forgot");
    }

    const user = await User.findById(record.user._id).select("+password");
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/auth/forgot");
    }

    // hash new password and save
    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    await user.save();

    // mark token as used
    record.used = true;
    await record.save();

    // optional: delete other tokens for this user
    await PasswordReset.updateMany({ user: user._id, used: false }, { used: true });

    req.flash("success", "Password reset successful — you may now log in.");
    return res.redirect("/auth/login");

  } catch (err) {
    next(err);
  }
}


  // Step 5: Logout (Safe for multi-role + JWT)
// Step 5: Logout
static logout(req, res) {
  // ✅ Flash BEFORE session is destroyed
  req.flash("success", "Logged out successfully.");

  // Destroy session + clear cookies
  req.session.destroy(() => {
    // Clear session cookie
    res.clearCookie("connect.sid");

    // Clear ALL role-based auth cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.clearCookie("admin_accessToken");
    res.clearCookie("client_accessToken");
    res.clearCookie("freelancer_accessToken");

    return res.redirect("/auth/login");
  });
}


}

module.exports = AuthController;
