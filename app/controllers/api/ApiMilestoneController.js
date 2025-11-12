// app/controllers/api/ApiMilestoneController.js

const Milestone = require("../../models/Milestone");
const Project = require("../../models/Project");
const PaymentService = require("../../services/PaymentService");
const EmailService = require("../../services/email.service");
const FileService = require("../../services/file.service");
const winston = require("../../config/winston");

class ApiMilestoneController {

  // app/controllers/api/ApiMilestoneController.js
static async getMilestoneById(req, res) {
  try {
    const { id } = req.params;
    const milestone = await Milestone.findById(id)
      .populate("project client freelancer", "title email fullName");

    if (!milestone)
      return res.status(404).json({ message: "Milestone not found" });

    return res.json({ milestone });
  } catch (err) {
    winston.error("Get Milestone Error: " + err.message);
    return res.status(500).json({ message: "Server error" });
  }
}

  /**
   * ✅ CLIENT: Create milestone
   * POST /api/milestone/:projectId
   */
  static async createMilestone(req, res) {
    try {
      const { projectId } = req.params;
      const { title, description, amount, dueDate } = req.body;
      const clientId = req.user._id;

      const project = await Project.findById(projectId).populate("hiredFreelancer", "email fullName");
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.client.toString() !== clientId.toString())
        return res.status(403).json({ message: "Unauthorized" });

      if (!project.hiredFreelancer)
        return res.status(400).json({ message: "No freelancer assigned yet" });

      const milestone = await Milestone.create({
        project: project._id,
        client: clientId,
        freelancer: project.hiredFreelancer._id,
        title,
        description,
        amount,
        dueDate,
        createdBy: clientId,
        assignedTo: project.hiredFreelancer._id,
        status: "created",
      });

      // Notify freelancer about new milestone
      await EmailService.sendNotification(
        project.hiredFreelancer.email,
        "🧾 New Milestone Created",
        `<p>Hello ${project.hiredFreelancer.fullName},</p>
         <p>The client has created a new milestone <b>${title}</b> for your project: <b>${project.title}</b>.</p>
         <p>Please review and accept the milestone before work begins.</p>`
      );

      return res.status(201).json({
        message: "Milestone created successfully and sent for freelancer acceptance",
        milestone,
      });
    } catch (err) {
      winston.error("Create Milestone Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ FREELANCER: Accept milestone
   * PATCH /api/milestone/:id/accept
   */
  static async acceptMilestone(req, res) {
    try {
      const { id } = req.params;
      const freelancerId = req.user._id;

      const milestone = await Milestone.findById(id)
        .populate("project client", "title email fullName");

      if (!milestone) return res.status(404).json({ message: "Milestone not found" });
      if (milestone.freelancer.toString() !== freelancerId.toString())
        return res.status(403).json({ message: "Unauthorized" });

      if (milestone.status !== "created")
        return res.status(400).json({ message: "Only 'created' milestones can be accepted" });

      milestone.status = "accepted";
      milestone.updatedAt = new Date();
      await milestone.save();

      // Notify client
      await EmailService.sendNotification(
        milestone.client.email,
        "✅ Milestone Accepted",
        `<p>Your freelancer has accepted the milestone <b>${milestone.title}</b> for the project <b>${milestone.project.title}</b>.</p>`
      );

      return res.json({
        message: "Milestone accepted successfully",
        milestone,
      });
    } catch (err) {
      winston.error("Accept Milestone Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ CLIENT: Fund milestone (escrow)
   * PATCH /api/milestone/:id/fund
   */
  static async fundMilestone(req, res) {
    try {
      const { id } = req.params;
      const { amount, razorpayPaymentId } = req.body;
      const clientUser = req.user;

      const milestone = await Milestone.findById(id);
      if (!milestone) return res.status(404).json({ message: "Milestone not found" });

      if (milestone.client.toString() !== clientUser._id.toString()) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (milestone.status !== "accepted") {
        return res.status(400).json({ message: "Milestone must be accepted by freelancer first" });
      }

      await PaymentService.fundEscrow(clientUser, id, amount, razorpayPaymentId);

      return res.json({
        message: "Milestone funded successfully (Escrow created)",
        milestoneId: id,
      });
    } catch (err) {
      winston.error("Fund Milestone Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ FREELANCER: Start work
   * PATCH /api/milestone/:id/start
   */
  static async startWork(req, res) {
    try {
      const { id } = req.params;
      const freelancerId = req.user._id;

      const milestone = await Milestone.findById(id).populate("project");
      if (!milestone) return res.status(404).json({ message: "Milestone not found" });

      if (milestone.freelancer.toString() !== freelancerId.toString())
        return res.status(403).json({ message: "Unauthorized" });

      if (milestone.status !== "funded")
        return res.status(400).json({ message: "Milestone must be funded first" });

      milestone.status = "in-progress";
      await milestone.save();

      await EmailService.sendNotification(
        milestone.project.client.email,
        "🚀 Work Started",
        `Freelancer has started work on milestone: <b>${milestone.title}</b>.`
      );

      return res.json({
        message: "Milestone work started",
        milestone,
      });
    } catch (err) {
      winston.error("Start Work Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ FREELANCER: Submit milestone deliverables
   * PATCH /api/milestone/:id/submit
   */
  static async submitWork(req, res) {
    try {
      const { id } = req.params;
      const freelancerId = req.user._id;

      const milestone = await Milestone.findById(id).populate("project client");

      if (!milestone) return res.status(404).json({ message: "Milestone not found" });
      if (milestone.freelancer.toString() !== freelancerId.toString())
        return res.status(403).json({ message: "Unauthorized" });

      const deliverables = [];

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const uploaded = await FileService.uploadFile(file.path, "deliverables");
          deliverables.push(uploaded);
        }
      }

      milestone.deliverables = deliverables;
      milestone.status = "submitted";
      milestone.updatedAt = new Date();
      await milestone.save();

      await EmailService.sendNotification(
        milestone.client.email,
        "📦 Milestone Submitted",
        `<p>Freelancer has submitted deliverables for milestone: <b>${milestone.title}</b>.</p>`
      );

      return res.json({
        message: "Milestone submitted for review",
        milestone,
      });
    } catch (err) {
      winston.error("Submit Work Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ CLIENT: Approve & release payment
   * PATCH /api/milestone/:id/release
   */
  static async releasePayment(req, res) {
    try {
      const { id } = req.params;
      const clientUser = req.user;

      const milestone = await Milestone.findById(id);
      if (!milestone) return res.status(404).json({ message: "Milestone not found" });
      if (milestone.client.toString() !== clientUser._id.toString())
        return res.status(403).json({ message: "Unauthorized" });

      if (!["submitted", "under-review"].includes(milestone.status)) {
        return res.status(400).json({ message: "Milestone must be submitted or under-review" });
      }

      await PaymentService.releasePayment(
        clientUser,
        milestone.freelancer,
        milestone._id,
        milestone.amount
      );

      return res.json({
        message: "Milestone payment released successfully",
        milestoneId: id,
      });
    } catch (err) {
      winston.error("Release Payment Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ CLIENT: Request revision
   * PATCH /api/milestone/:id/revision
   */
  static async requestRevision(req, res) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const milestone = await Milestone.findById(id);
      if (!milestone) return res.status(404).json({ message: "Milestone not found" });

      milestone.status = "revision-requested";
      milestone.notes = notes;
      await milestone.save();

      return res.json({
        message: "Revision requested successfully",
        milestone,
      });
    } catch (err) {
      winston.error("Request Revision Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = ApiMilestoneController;
