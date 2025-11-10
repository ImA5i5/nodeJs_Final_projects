// app/controllers/FreelancerController.js
const Project = require("../models/Project");
const Bid = require("../models/Bid");
const Review = require("../models/Review");
const Payment = require("../models/Payment");
const User = require("../models/User");
const cloudinary = require("../config/cloudinary");
const winston = require("../config/winston");


class FreelancerController {
  
 /**
   * 🏠 Freelancer Dashboard
   */
   static async dashboard(req, res) {
    try {
      const freelancerId = req.user._id;

      // ✅ Total Bids
      const bids = await Bid.find({ freelancer: freelancerId }).populate("project");

      // ✅ Total Earnings
      const paidMilestones = await Payment.find({
        freelancer: freelancerId,
        status: "released"
      });

      const earnings = paidMilestones.reduce((sum, p) => sum + p.amount, 0);

      // ✅ ⭐ RATING
      const rating = req.user?.profile?.rating || 0;

      // ✅ ACTIVE PROJECTS (REQUIRED)
      const activeProjects = await Project.countDocuments({
        hiredFreelancer: freelancerId,
        status: "in-progress"
      });

      // ✅ COMPLETED PROJECTS (REQUIRED)
      const completedProjects = await Project.countDocuments({
        hiredFreelancer: freelancerId,
        status: "completed"
      });

      // ✅ Recent Payments
      const recentPayments = await Payment.find({
        freelancer: freelancerId,
        status: "released"
      })
        .populate("project")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      // ✅ Monthly Earnings Graph Data
      const monthlyMap = Array(12).fill(0);
      paidMilestones.forEach(p => {
        const m = new Date(p.createdAt).getMonth();
        monthlyMap[m] += p.amount;
      });

      // ✅ RENDER DASHBOARD
      res.render("pages/freelancer/dashboard", {
        layout: "layouts/freelancer-layout",
        title: "Freelancer Dashboard",

        bids,
        earnings,
        rating,
        activeProjects,
        completedProjects,
        recentPayments,
        monthlyEarnings: monthlyMap,
        user: req.user
      });

    } catch (err) {
      console.error("Dashboard Error:", err);
      res.status(500).render("errors/500");
    }
  }


  /**
   * 👤 View Freelancer Profile (Full View)
   */
  static async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user._id).lean();
      res.render("pages/freelancer/profile", {
        layout: "layouts/freelancer-layout",
        title: "My Profile",
        user,
      });
    } catch (err) {
      winston.error("Get Profile Error: " + err.message);
      next(err);
    }
  }

  /**
   * 📝 Update Freelancer Profile
   * Handles:
   *  - Basic info (name, bio, rate, experience)
   *  - Skills and certifications
   *  - Profile picture upload
   *  - Portfolio upload (multiple)
   *  - Supports both form submission & AJAX requests
   */
static async updateProfile(req, res, next) {
    try {
      const {
        fullName,
        bio,
        experience,
        hourlyRate,
        skills,
        certifications,
      } = req.body;

      const profileUpdates = {
        fullName: fullName?.trim(),
        "profile.bio": bio?.trim(),
        "profile.experience": experience ? Number(experience) : 0,
        "profile.hourlyRate": hourlyRate ? Number(hourlyRate) : 0,
        "profile.skills": skills
          ? skills.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        "profile.certifications": certifications
          ? certifications.split(",").map((c) => c.trim()).filter(Boolean)
          : [],
      };

      // Handle single profile picture (uploaded via CloudinaryStorage)
      if (req.files && req.files.profilePic && req.files.profilePic[0]) {
        const uploadedPic = req.files.profilePic[0];
        profileUpdates["profile.profilePic"] = uploadedPic.path; // Cloudinary returns secure URL as .path
      }

      // Handle portfolio uploads (multiple)
      if (req.files && req.files.portfolio && req.files.portfolio.length > 0) {
        profileUpdates["profile.portfolio"] = req.files.portfolio.map(
          (file) => file.path
        );
      }

      await User.findByIdAndUpdate(req.user._id, { $set: profileUpdates });

      // Response handling for AJAX vs normal form submission
      if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({
          success: true,
          message: "Profile updated successfully!",
        });
      }

      req.flash("success", "Profile updated successfully!");
      res.redirect("/freelancer/profile");
    } catch (err) {
      winston.error("Freelancer Update Profile Error: " + err.message);

      if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res
          .status(500)
          .json({ success: false, message: "Error updating profile." });
      }

      req.flash("error", "Error updating profile.");
      res.redirect("/freelancer/profile");
    }
  }

  /**
   * ⭐ View Ratings and Reviews
   */
static async getReviews(req, res, next) {
    try {
      const freelancerId = req.user._id;

      // Fetch reviews for this freelancer
      const reviews = await Review.find({ freelancer: freelancerId })
        .populate("client project", "fullName title")
        .sort({ createdAt: -1 })
        .lean();

      // Calculate average rating safely
      const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      const averageRating = reviews.length ? (totalRating / reviews.length).toFixed(1) : 0;

      res.render("pages/freelancer/reviews", {
        layout: "layouts/freelancer-layout",
        title: "My Reviews",
        reviews,
        averageRating, // ✅ include this
      });
    } catch (err) {
      winston.error("Freelancer Reviews Error: " + err.message);
      next(err);
    }
  }

  
}

module.exports = FreelancerController;
