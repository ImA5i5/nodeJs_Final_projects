// app/controllers/api/ApiFreelancerController.js

const User = require("../../models/User");
const Project = require("../../models/Project");
const Proposal = require("../../models/Proposal");
const Payment = require("../../models/Payment");
const winston = require("../../config/winston");

class ApiFreelancerController {

  /**
   * ✅ FREELANCER DASHBOARD STATS
   */
  static async dashboard(req, res) {
    try {
      const freelancerId = req.user._id;

      const totalBids = await Proposal.countDocuments({ freelancer: freelancerId });

      const releasedPayments = await Payment.aggregate([
        { $match: { freelancer: freelancerId, status: "released" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      const totalEarnings = releasedPayments[0]?.total || 0;

      const totalProjects = await Project.countDocuments({ hiredFreelancer: freelancerId });

      return res.json({
        message: "Freelancer dashboard stats",
        data: { totalBids, totalEarnings, totalProjects },
      });

    } catch (err) {
      winston.error("Dashboard Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ CREATE FREELANCER PROFILE
   * first time setup
   */
  static async createProfile(req, res) {
    try {
      const freelancer = await User.findById(req.user._id);

      if (!freelancer) {
        return res.status(404).json({ message: "Freelancer not found" });
      }

      const { fullName, bio, skills, experience, hourlyRate } = req.body;

      if (fullName) freelancer.fullName = fullName;
      if (bio) freelancer.profile.bio = bio;
      if (skills && Array.isArray(skills)) freelancer.profile.skills = skills;
      if (experience !== undefined) freelancer.profile.experience = experience;
      if (hourlyRate !== undefined) freelancer.profile.hourlyRate = hourlyRate;

      // profilePic from file upload
      if (req.files?.profilePic && req.files.profilePic[0]) {
        freelancer.profile.profilePic = req.files.profilePic[0].path;
      }

      // portfolio upload
      if (req.files?.portfolio) {
        const uploadedFiles = req.files.portfolio.map((f) => f.path);
        freelancer.profile.portfolio.push(...uploadedFiles);
      }

      await freelancer.save();

      return res.status(201).json({
        message: "Freelancer profile created successfully",
        user: freelancer,
      });

    } catch (err) {
      winston.error("Create Profile Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ UPDATE PROFILE
   */
  static async updateProfile(req, res) {
    try {
      const freelancer = await User.findById(req.user._id);

      if (!freelancer) {
        return res.status(404).json({ message: "Freelancer not found" });
      }

      const { bio, skills, experience, hourlyRate } = req.body;

      if (bio !== undefined) freelancer.profile.bio = bio;
      if (experience !== undefined) freelancer.profile.experience = experience;
      if (hourlyRate !== undefined) freelancer.profile.hourlyRate = hourlyRate;

      if (skills && Array.isArray(skills)) {
        freelancer.profile.skills = skills;
      }

      await freelancer.save();

      return res.json({
        message: "Profile updated successfully",
        user: freelancer,
      });

    } catch (err) {
      winston.error("Update Profile Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ UPLOAD PROFILE PIC + PORTFOLIO
   */
  static async uploadMedia(req, res) {
    try {
      const freelancer = await User.findById(req.user._id);

      if (!freelancer) {
        return res.status(404).json({ message: "Freelancer not found" });
      }

      // profile picture
      if (req.files?.profilePic && req.files.profilePic[0]) {
        freelancer.profile.profilePic = req.files.profilePic[0].path;
      }

      // portfolio images/documents
      if (req.files?.portfolio) {
        const uploaded = req.files.portfolio.map((f) => f.path);
        freelancer.profile.portfolio.push(...uploaded);
      }

      await freelancer.save();

      return res.json({
        message: "Profile media uploaded successfully",
        user: freelancer,
      });

    } catch (err) {
      winston.error("Upload Media Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ ADD SKILL
   */
  static async addSkill(req, res) {
    try {
      const { skill } = req.body;

      if (!skill) {
        return res.status(400).json({ message: "Skill is required" });
      }

      const freelancer = await User.findById(req.user._id);

      if (freelancer.profile.skills.includes(skill)) {
        return res.status(400).json({ message: "Skill already exists" });
      }

      freelancer.profile.skills.push(skill);
      await freelancer.save();

      return res.json({
        message: "Skill added successfully",
        skills: freelancer.profile.skills,
      });

    } catch (err) {
      winston.error("Add Skill Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ ADD CERTIFICATION
   */
  static async addCertification(req, res) {
    try {
      const { certification } = req.body;

      if (!certification) {
        return res.status(400).json({ message: "Certification is required" });
      }

      const freelancer = await User.findById(req.user._id);

      if (!freelancer.profile.certifications) {
        freelancer.profile.certifications = [];
      }

      freelancer.profile.certifications.push(certification);
      await freelancer.save();

      return res.json({
        message: "Certification added",
        certifications: freelancer.profile.certifications,
      });

    } catch (err) {
      winston.error("Add Certification Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ VIEW REVIEWS
   */
  static async getReviews(req, res) {
    try {
      const freelancerId = req.user._id;

      const projects = await Project.find({
        hiredFreelancer: freelancerId,
        reviewed: true,
      }).populate("client", "fullName email");

      return res.json({
        message: "Freelancer reviews",
        reviews: projects,
      });

    } catch (err) {
      winston.error("Get Reviews Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = ApiFreelancerController;
