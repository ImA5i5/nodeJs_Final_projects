// app/controllers/api/ApiBidController.js

const Bid = require("../../models/Bid");
const Project = require("../../models/Project");
const EmailService = require("../../services/email.service");
const User = require("../../models/User");
const winston = require("../../config/winston");

class ApiBidController {

  /**
   * ✅ FREELANCER: Submit a bid
   * POST /api/bid/:projectId
   */
  static async submitBid(req, res) {
    try {
      const freelancerId = req.user._id;
      const { projectId } = req.params;
      const { bidAmount, deliveryTime, coverLetter } = req.body;

      if (!bidAmount || !deliveryTime || !coverLetter) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const project = await Project.findById(projectId);
      if (!project || project.status !== "approved") {
        return res.status(400).json({ message: "Project not available for bidding" });
      }

      // ✅ Prevent duplicate bids by the same freelancer
      const existingBid = await Bid.findOne({ project: projectId, freelancer: freelancerId });
      if (existingBid) {
        return res.status(400).json({ message: "You already submitted a bid" });
      }

      const bid = await Bid.create({
        project: projectId,
        freelancer: freelancerId,
        bidAmount,
        deliveryTime,
        coverLetter,
        status: "pending",
      });

      return res.status(201).json({
        message: "Bid submitted successfully",
        bid,
      });
    } catch (err) {
      winston.error("Submit Bid Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ FREELANCER: Withdraw bid
   * DELETE /api/bid/:bidId
   */
  static async withdrawBid(req, res) {
    try {
      const { bidId } = req.params;
      const freelancerId = req.user._id;

      const bid = await Bid.findOne({ _id: bidId, freelancer: freelancerId });

      if (!bid) return res.status(404).json({ message: "Bid not found" });
      if (bid.status !== "pending") {
        return res.status(400).json({ message: "You can only withdraw a pending bid" });
      }

      bid.status = "withdrawn";
      await bid.save();

      return res.json({ message: "Bid withdrawn successfully" });
    } catch (err) {
      winston.error("Withdraw Bid Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  // ----------------------------------------------------------------
  // ✅ CLIENT SIDE BID HANDLING
  // ----------------------------------------------------------------

  /**
   * ✅ CLIENT: View all bids on a project
   * GET /api/bid/project/:projectId
   */
  static async getBidsForProject(req, res) {
    try {
      const { projectId } = req.params;

      const project = await Project.findOne({
        _id: projectId,
        client: req.user._id,
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found or unauthorized" });
      }

      const bids = await Bid.find({ project: projectId })
        .populate("freelancer", "fullName email profile.rating profile.totalReviews");

      return res.json({ bids });
    } catch (err) {
      winston.error("Get Bids Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ CLIENT: Shortlist a bid
   * PATCH /api/bid/:bidId/shortlist
   */
  static async shortlistBid(req, res) {
    try {
      const { bidId } = req.params;

      const bid = await Bid.findById(bidId).populate("project");
      if (!bid) return res.status(404).json({ message: "Bid not found" });

      if (bid.project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      bid.status = "reviewed";
      await bid.save();

      return res.json({ message: "Bid shortlisted", bid });
    } catch (err) {
      winston.error("Shortlist Bid Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ CLIENT: Reject a bid
   * PATCH /api/bid/:bidId/reject
   */
  static async rejectBid(req, res) {
    try {
      const { bidId } = req.params;

      const bid = await Bid.findById(bidId).populate("project");
      if (!bid) return res.status(404).json({ message: "Bid not found" });

      if (bid.project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      bid.status = "rejected";
      await bid.save();

      return res.json({ message: "Bid rejected", bid });
    } catch (err) {
      winston.error("Reject Bid Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ CLIENT: Accept (Hire) a Freelancer
   * PATCH /api/bid/:bidId/accept
   */
  static async acceptBid(req, res) {
    try {
      const { bidId } = req.params;

      const bid = await Bid.findById(bidId)
        .populate("freelancer")
        .populate("project");

      if (!bid) return res.status(404).json({ message: "Bid not found" });

      const project = bid.project;
      if (project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // ✅ Update bid status
      bid.status = "accepted";
      await bid.save();

      // ✅ Mark all other bids as rejected
      await Bid.updateMany(
        { project: project._id, _id: { $ne: bidId } },
        { $set: { status: "rejected" } }
      );

      // ✅ Assign freelancer to project
      project.hiredFreelancer = bid.freelancer._id;
      project.status = "assigned";
      await project.save();

      // ✅ Email notification to freelancer
      await EmailService.sendFreelancerHired(
        bid.freelancer.email,
        bid.freelancer.fullName,
        req.user.fullName,
        project.title,
        project.budget
      );

      return res.json({
        message: "Freelancer hired successfully",
        project,
        bid,
      });
    } catch (err) {
      winston.error("Accept Bid Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
 * ✅ CLIENT: Hire a freelancer for a project
 * PATCH /api/bid/:bidId/hire
 */
static async hireFreelancer(req, res) {
  try {
    const { bidId } = req.params;
    const clientId = req.user._id;

    // 🔍 Find bid with project and freelancer info
    const bid = await Bid.findById(bidId)
      .populate("project")
      .populate("freelancer", "email fullName");

    if (!bid) return res.status(404).json({ message: "Bid not found" });

    const project = bid.project;

    // 🧾 Check project ownership
    if (project.client.toString() !== clientId.toString()) {
      return res.status(403).json({ message: "Unauthorized: Not your project" });
    }

    // 🚫 Only allow hiring once
    if (project.hiredFreelancer) {
      return res.status(400).json({ message: "Freelancer already hired for this project" });
    }

    // ✅ Update statuses
    bid.status = "accepted";
    await bid.save();

    project.hiredFreelancer = bid.freelancer._id;
    project.status = "assigned";
    await project.save();

    // ❌ Reject all other bids for same project
    await Bid.updateMany(
      { project: project._id, _id: { $ne: bid._id } },
      { status: "rejected" }
    );

    // 📧 Notify freelancer (EmailService)
    await EmailService.sendFreelancerHired(
      bid.freelancer.email,
      bid.freelancer.fullName,
      req.user.fullName,
      project.title,
      project.budget
    );

    return res.json({
      message: "Freelancer hired successfully",
      project: {
        id: project._id,
        title: project.title,
        status: project.status,
      },
    });
  } catch (err) {
    winston.error("Hire Freelancer Error: " + err.message);
    return res.status(500).json({ message: "Server error" });
  }
}

}

module.exports = ApiBidController;
