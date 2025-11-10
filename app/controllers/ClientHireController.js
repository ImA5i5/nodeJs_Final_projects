// app/controllers/ClientHireController.js
const User = require("../models/User");
const Project = require("../models/Project");
const Bid = require("../models/Bid");
const Review = require("../models/Review");
const winston = require("../config/winston");
const Message = require("../models/Message"); // optional - create in-app message
const EmailService = require("../services/email.service");

class ClientHireController {
  /**
   * 🔍 Browse freelancers (search + filter)
   */
  static async browseFreelancers(req, res, next) {
    try {
      const { skill, minRate, maxRate, keyword } = req.query;

      const filters = { role: "freelancer" };

      if (skill) filters["profile.skills"] = { $regex: skill, $options: "i" };
      if (minRate || maxRate)
        filters["profile.hourlyRate"] = {
          ...(minRate ? { $gte: Number(minRate) } : {}),
          ...(maxRate ? { $lte: Number(maxRate) } : {}),
        };
      if (keyword)
        filters["$or"] = [
          { fullName: { $regex: keyword, $options: "i" } },
          { "profile.bio": { $regex: keyword, $options: "i" } },
        ];

      const freelancers = await User.find(filters)
        .select("fullName profile.bio profile.hourlyRate profile.skills profile.profilePic")
        .lean();

      if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.json({ success: true, freelancers });
      }

      res.render("pages/client/hire-freelancers", {
        layout: "layouts/client-layout",
        title: "Hire Freelancers",
        freelancers,
      });
    } catch (err) {
      winston.error("Browse Freelancers Error: " + err.message);
      next(err);
    }
  }

  /**
   * 👀 View freelancer profile + reviews + client’s available projects for hire
   */
  static async viewFreelancerProfile(req, res, next) {
  try {
    const freelancer = await User.findById(req.params.id)
      .select("-password")
      .lean();

    if (!freelancer) return res.status(404).send("Freelancer not found");

    const reviews = await Review.find({ freelancer: freelancer._id })
      .populate("client project", "fullName title")
      .lean();

    const projects = await Project.find({
      client: req.user._id,
      status: { $in: ["pending", "approved"] },
    })
      .select("_id title")
      .lean();

    const avgRating = reviews.length
      ? (reviews.reduce((a, b) => a + (b.rating || 0), 0) / reviews.length).toFixed(1)
      : 0;

    res.render("pages/client/view-freelancer", {
      layout: "layouts/client-layout",
      title: freelancer.fullName,
      freelancer,
      reviews,
      avgRating,
      projects,
    });
  } catch (err) {
    console.error("View Freelancer Error:", err);
    next(err);
  }
}

  /**
 * 💼 View all projects where client has hired freelancers
 */
static async viewHiredProjects(req, res, next) {
  try {
    const projects = await Project.find({
      client: req.user._id,
      hiredFreelancer: { $exists: true, $ne: null },
    })
      .populate("hiredFreelancer", "fullName email profile.profilePic")
      .sort({ updatedAt: -1 })
      .lean();

    res.render("pages/client/hired-projects", {
      layout: "layouts/client-layout",
      title: "My Hired Freelancers",
      projects,
    });
  } catch (err) {
    winston.error("View Hired Projects Error:", err.message);
    next(err);
  }
}


  /**
   * 💬 View all proposals submitted to client’s projects
   */
  static async viewProposals(req, res, next) {
    try {
      const projects = await Project.find({ client: req.user._id }).select("_id title");
      const projectIds = projects.map((p) => p._id);

      const proposals = await Bid.find({ project: { $in: projectIds } })
        .populate("freelancer project", "fullName profile.profilePic title")
        .sort({ createdAt: -1 })
        .lean();

      const hasProposals = proposals && proposals.length > 0;

      res.render("pages/client/proposals", {
        layout: "layouts/client-layout",
        title: "Freelancer Proposals",
        proposals,
        hasProposals,
      });
    } catch (err) {
      winston.error("View Proposals Error: " + err.message);
      next(err);
    }
  }

  /**
   * ⭐ Shortlist Proposal (AJAX)
   */
  static async shortlistProposal(req, res) {
    try {
      const bid = await Bid.findById(req.params.id);
      if (!bid) return res.status(404).json({ success: false, message: "Proposal not found." });

      bid.status = "shortlisted";
      await bid.save();

      res.json({ success: true, message: "Proposal shortlisted successfully!" });
    } catch (err) {
      winston.error("Shortlist Proposal Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error." });
    }
  }

  /**
   * ✅ Accept Proposal (Hire Freelancer)
   * POST /client/proposals/:id/accept
   */
  static async acceptProposal(req, res) {
    try {
      // 1️⃣ Find the bid and populate project + freelancer
      const bid = await Bid.findById(req.params.id)
        .populate("project freelancer")
        .lean(false);

      if (!bid) return res.status(404).json({ success: false, message: "Proposal not found." });
      if (!bid.project)
        return res.status(400).json({ success: false, message: "This bid has no associated project." });

      // 2️⃣ Verify client ownership
      if (bid.project.client?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Not authorized to accept this proposal." });
      }

      // 3️⃣ Load project directly to avoid stale populate doc
      const project = await Project.findById(bid.project._id);
      if (!project) return res.status(404).json({ success: false, message: "Project not found." });

      // 4️⃣ Update project and bid
      project.hiredFreelancer = bid.freelancer._id;
      project.status = "assigned";
      await project.save();

      bid.status = "accepted";
      await bid.save();

      // 5️⃣ Reject all other bids on same project
      await Bid.updateMany(
        { project: project._id, _id: { $ne: bid._id } },
        { status: "rejected" }
      );

      // 6️⃣ Send email to freelancer
      try {
        const subject = `🎉 You've been hired for "${project.title}"`;
        const msgHtml = `
          <p>Hi ${bid.freelancer.fullName || "Freelancer"},</p>
          <p>Great news — <strong>${req.user.fullName || "A client"}</strong> has hired you for the project <b>${project.title}</b>.</p>
          <p><b>Budget:</b> ₹${project.budget || "N/A"}</p>
          <p>Please log in to your dashboard to accept the project and start work:</p>
          <p><a href="${process.env.BASE_URL || ""}/freelancer/my-projects" target="_blank">Go to My Projects</a></p>
          <p>— Freelancer Marketplace Team</p>
        `;
        await EmailService.sendNotification(bid.freelancer.email, subject, msgHtml);
      } catch (emailErr) {
        winston.warn("Hire: failed to send email to freelancer: " + emailErr.message);
      }

      // 7️⃣ Create in-app message safely
      try {
        await Message.create({
          sender: req.user._id,
          receiver: bid.freelancer._id,
          project: project._id, // ✅ required!
          message: `🎉 You've been hired for ${project.title}!`,
          type: "hire",
        });
      } catch (msgErr) {
        winston.warn("Hire: failed to create in-app message: " + msgErr.message);
      }

      // 8️⃣ Done ✅
      return res.json({ success: true, message: "Freelancer hired successfully!" });
    } catch (err) {
      winston.error("Accept Proposal Error: " + err.message);
      return res.status(500).json({ success: false, message: "Server error." });
    }
  }


  /**
   * ❌ Reject Proposal
   */
  static async rejectProposal(req, res) {
    try {
      const bid = await Bid.findById(req.params.id);
      if (!bid)
        return res.status(404).json({ success: false, message: "Proposal not found." });

      bid.status = "rejected";
      await bid.save();

      res.json({ success: true, message: "Proposal rejected successfully!" });
    } catch (err) {
      winston.error("Reject Proposal Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error." });
    }
  }

  /**
   * 🤝 Hire freelancer directly via projectId + freelancerId (optional)
   */
  static async hireFreelancer(req, res) {
    try {
      const { freelancerId, projectId } = req.params;

      const project = await Project.findById(projectId);
      if (!project || project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Unauthorized." });
      }

      project.hiredFreelancer = freelancerId;
      project.status = "in-progress";
      await project.save();

      res.json({ success: true, message: "Freelancer hired successfully!" });
    } catch (err) {
      winston.error("Hire Freelancer Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error." });
    }
  }

  /**
 * ✅ Mark project as completed (Client action)
 */
static async approveFinalWork(req, res) {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    // ✅ FINAL APPROVAL → COMPLETED
    project.status = "completed";
    project.completedAt = new Date();
    await project.save();

    return res.json({
      success: true,
      message: "✅ Project Approved & Completed Successfully!"
    });

  } catch (err) {
    winston.error("Approve Final Work Error: " + err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}


}

module.exports = ClientHireController;
