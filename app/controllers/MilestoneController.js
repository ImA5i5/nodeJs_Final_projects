// app/controllers/MilestoneController.js
const Milestone = require("../models/Milestone");
const Project = require("../models/Project");
const Payment = require("../models/Payment"); // if you have one
const winston = require("../config/winston");
const EmailService = require("../services/email.service"); // if present
const updateProjectProgress = require("../utils/updateProjectProgress");

class MilestoneController {
  // Client: Create milestone (client own project)
  static async create(req, res) {
    try {
      const { projectId } = req.params;
      const { title, description, amount, dueDate } = req.body;

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ success: false, message: "Project not found" });
      if (project.client.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: "Not authorized" });

      const m = await Milestone.create({
        project: projectId,
        title,
        description,
        amount,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: req.user._id,
        assignedTo: project.hiredFreelancer || null,
        status: "created"
      });

      res.json({ success: true, message: "Milestone created", milestone: m });
    } catch (err) {
      winston.error("Milestone create error: " + err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // Client: Deposit funds to escrow for a milestone
  static async depositEscrow(req, res) {
    try {
      const { id } = req.params; // milestoneId
      const milestone = await Milestone.findById(id).populate("project");
      if (!milestone) return res.status(404).json({ success: false, message: "Milestone not found" });
      if (milestone.project.client.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: "Not authorized" });

      // TODO: integrate real payment gateway; here we simulate escrow creation
      // Example: create Payment record with status "in-escrow"
      // const payment = await Payment.create({ client: req.user._id, milestone: id, amount: milestone.amount, status: "in-escrow" });

      milestone.status = "funded";
      await milestone.save();

      // Optionally notify freelancer
      try {
        await EmailService.sendNotification(
          milestone.assignedToEmail || "freelancer@example.com",
          `Escrow funded for milestone: ${milestone.title}`,
          `Client has funded ₹${milestone.amount} for milestone "${milestone.title}".`
        );
      } catch (e) { winston.warn("Escrow email failed: " + e.message); }

      res.json({ success: true, message: "Escrow funded successfully", milestone });
    } catch (err) {
      winston.error("depositEscrow error: " + err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // Freelancer: Start / mark in-progress
  static async start(req, res) {
    try {
      const { id } = req.params; // milestoneId
      const milestone = await Milestone.findById(id).populate("project");
      if (!milestone) return res.status(404).json({ success: false, message: "Not found" });
      // ensure this freelancer is assigned to project
      if (milestone.assignedTo?.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: "Not authorized" });

      if (!["funded", "created"].includes(milestone.status))
        return res.status(400).json({ success: false, message: "Milestone not fundable or already started" });

      milestone.status = "in-progress";
      await milestone.save();

      res.json({ success: true, message: "Milestone started", milestone });
    } catch (err) {
      winston.error("start milestone error: " + err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // Freelancer: Upload deliverables (files array already uploaded and URLs present in req.files)
  static async uploadDeliverables(req, res) {
    try {
      const { id } = req.params;
      const milestone = await Milestone.findById(id).populate("project");
      if (!milestone) return res.status(404).json({ success: false, message: "Not found" });
      if (milestone.assignedTo?.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: "Not authorized" });

      const uploaded = (req.files || []).map(f => f.path || f.secure_url || f.location); // adapt to cloudinary
      milestone.attachments.push(...uploaded);
      milestone.status = "submitted";
      await milestone.save();

      // notify client
      try {
        const client = await User.findById(milestone.project.client);
        await EmailService.sendNotification(client.email, `Milestone submitted: ${milestone.title}`, `Freelancer uploaded deliverables for milestone "${milestone.title}".`);
      } catch (e) { winston.warn(e.message); }

      res.json({ success: true, message: "Deliverables uploaded and submitted for review", milestone });
    } catch (err) {
      winston.error("uploadDeliverables error: " + err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // Client: Review -> approve (release payment) or request revision
  static async clientReviewAction(req, res) {
    try {
      const { id } = req.params; // milestoneId
      const { action, note } = req.body; // action = 'approve'|'request_revision'
      const milestone = await Milestone.findById(id).populate("project");
      if (!milestone) return res.status(404).json({ success: false, message: "Not found" });
      if (milestone.project.client.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: "Not authorized" });

      if (action === "approve") {
        // release funds → Payment integration here
        milestone.status = "released"; // or "completed" if this finalizes
        await milestone.save();

        // optionally record a Payment document with status 'released'
        res.json({ success: true, message: "Milestone approved and payment released", milestone });
      } else if (action === "request_revision") {
        milestone.status = "revision-requested";
        await milestone.save();
        res.json({ success: true, message: "Revision requested", milestone });
      } else {
        res.status(400).json({ success: false, message: "Invalid action" });
      }
    } catch (err) {
      winston.error("clientReviewAction error: " + err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // Admin: List / monitor milestones (optional)
  static async listForProject(req, res) {
    try {
      const { projectId } = req.params;
      const milestones = await Milestone.find({ project: projectId }).populate("assignedTo createdBy").lean();
      res.json({ success: true, milestones });
    } catch (err) {
      winston.error(err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  //define progressbar for Client Approves Milestone
  static async approveMilestone(req, res) {
    try {
      const milestone = await Milestone.findById(req.params.id).populate("project");

      if (!milestone) return res.status(404).json({ success: false, message: "Milestone not found" });
      if (milestone.status !== "submitted")
        return res.status(400).json({ success: false, message: "Milestone not in submitted state." });

      milestone.status = "released";
      milestone.releasedAt = new Date();
      await milestone.save();

      // ✅ Update project progress
      await updateProjectProgress(milestone.project._id);

      // ✅ Notify freelancer
      await EmailService.sendNotification(
        milestone.project.hiredFreelancer.email,
        `✅ Milestone "${milestone.title}" Approved`,
        `Your milestone has been approved and payment released!`
      );

      res.json({ success: true, message: "Milestone approved and progress updated." });
    } catch (err) {
      console.error("Approve Milestone Error:", err);
      res.status(500).json({ success: false, message: "Error approving milestone" });
    }
  }

  //progress bar for  Freelancer Submits Milestone
  static async submitMilestone(req, res) {
  try {
    const milestone = await Milestone.findById(req.params.id).populate("project");
    if (!milestone) return res.status(404).json({ success: false });
    if (milestone.status !== "in-progress")
      return res.status(400).json({ success: false, message: "Milestone not in progress" });

    milestone.status = "submitted";
    milestone.submittedAt = new Date();
    await milestone.save();

    // Optional: recalc progress (if you want partial progress shown)
    await updateProjectProgress(milestone.project._id);

    await EmailService.sendNotification(
      milestone.project.client.email,
      `🚀 Milestone "${milestone.title}" Submitted`,
      `Freelancer has submitted this milestone for review.`
    );

    res.json({ success: true, message: "Milestone submitted for review." });
  } catch (err) {
    console.error("Submit Milestone Error:", err);
    res.status(500).json({ success: false, message: "Error submitting milestone" });
  }
}

//progress bar for Client Requests Changes
static async requestChanges(req, res) {
  try {
    const { feedback } = req.body;
    const milestone = await Milestone.findById(req.params.id).populate("project");
    if (!milestone) return res.status(404).json({ success: false });
    if (milestone.status !== "submitted")
      return res.status(400).json({ success: false, message: "Not in submitted state" });

    milestone.status = "revision-requested";
    milestone.revisionFeedback = feedback;
    milestone.revisionRequestedAt = new Date();
    await milestone.save();

    // ✅ Update progress — may decrease progress if previously counted
    await updateProjectProgress(milestone.project._id);

    await EmailService.sendNotification(
      milestone.project.hiredFreelancer.email,
      `🔁 Revision Requested for "${milestone.title}"`,
      `Client requested revisions: ${feedback}`
    );

    res.json({ success: true, message: "Revision requested." });
  } catch (err) {
    console.error("Request Changes Error:", err);
    res.status(500).json({ success: false, message: "Error requesting changes" });
  }
}


}

module.exports = MilestoneController;
