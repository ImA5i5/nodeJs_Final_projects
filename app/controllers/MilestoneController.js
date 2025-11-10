// app/controllers/MilestoneController.js

const Milestone = require("../models/Milestone");
const Dispute = require("../models/Dispute");
const Project = require("../models/Project");
const winston = require("../config/winston");
const FileService = require("../services/file.service");
const PaymentController = require("./PaymentController");
const PaymentService = require("../services/PaymentService"); // for escrow + release

class MilestoneController {
  /* =====================================================
     ✅ CLIENT — CREATE MILESTONE
  ======================================================*/
  static async create(req, res) {
  try {
    const { projectId } = req.params;
    const { title, description, amount, dueDate } = req.body;

    const project = await Project.findOne({
      _id: projectId,
      client: req.user._id,
    });

    if (!project) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // ✅ FIX: Check if freelancer hired
    if (!project.hiredFreelancer) {
      return res.status(400).json({
        success: false,
        message: "Please hire a freelancer before creating milestones."
      });
    }

    const milestone = await Milestone.create({
      project: projectId,
      client: req.user._id,
      freelancer: project.hiredFreelancer, // ✅ Will not be missing now
      title,
      description,
      amount,
      dueDate,
      status: "created",
      createdBy: req.user._id,
      assignedTo: project.hiredFreelancer,
    });

    return res.json({
      success: true,
      message: "Milestone created",
      milestone,
    });

  } catch (err) {
    console.error("Create Milestone Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
}


  /* =====================================================
     ✅ CLIENT — FUND (ESCROW)
  ======================================================*/
  static async fund(req, res) {
    try {
      const milestoneId = req.params.id;

      const milestone = await Milestone.findById(milestoneId);

      if (!milestone || milestone.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }

      if (milestone.status !== "created") {
        return res.status(400).json({
          success: false,
          message: "Milestone already funded or started",
        });
      }

      // ✅ Delegating to PaymentController → Razorpay
      const result = await PaymentController.depositEscrowForMilestoneInternal(
        milestoneId,
        milestone.amount,
        req.user
      );

      return res.json(result);
    } catch (err) {
      winston.error("Fund Milestone Error: " + err.message);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /* =====================================================
     ✅ FREELANCER — START WORK
  ======================================================*/
  static async start(req, res) {
    try {
      const milestoneId = req.params.id;
      const milestone = await Milestone.findById(milestoneId);

      if (!milestone || milestone.freelancer.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: "Unauthorized" });

      if (milestone.status !== "funded")
        return res.status(400).json({
          success: false,
          message: "Milestone must be funded before work can start.",
        });

      milestone.status = "in-progress";
      milestone.updatedAt = new Date();
      await milestone.save();

      return res.json({ success: true, message: "Work started", milestone });
    } catch (err) {
      winston.error("Start Milestone Error: " + err.message);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /* =====================================================
     ✅ FREELANCER — SUBMIT WORK
  ======================================================*/
  static async submit(req, res) {
    try {
      const milestoneId = req.params.id;

      const milestone = await Milestone.findById(milestoneId);
      if (!milestone || milestone.freelancer.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: "Unauthorized" });

      if (milestone.status !== "in-progress")
        return res.status(400).json({
          success: false,
          message: "Milestone is not in-progress",
        });

      let uploadedFiles = [];

      if (req.files) {
        for (let file of req.files) uploadedFiles.push(file.path);
      }

      milestone.status = "submitted";
      milestone.deliverables = uploadedFiles;
      milestone.updatedAt = new Date();
      await milestone.save();

      return res.json({
        success: true,
        message: "Work submitted",
        milestone,
      });
    } catch (err) {
      winston.error("Submit Milestone Error: " + err.message);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /* =====================================================
     ✅ CLIENT — APPROVE & RELEASE PAYMENT
  ======================================================*/
  static async release(req, res) {
    try {
      const milestoneId = req.params.id;

      const milestone = await Milestone.findById(milestoneId);
      if (!milestone)
        return res.json({ success: false, message: "Milestone not found" });

      if (milestone.client.toString() !== req.user._id.toString())
        return res.json({ success: false, message: "Unauthorized" });

      if (!["submitted", "under-review"].includes(milestone.status))
        return res.json({ success: false, message: "Milestone not ready for release" });

      // ✅ Correct function call (your system uses PaymentService)
      const result = await PaymentService.releasePayment(
        req.user,
        milestone.freelancer,
        milestoneId,
        milestone.amount
      );

      if (!result.success)
        return res.json({ success: false, message: result.message });

      return res.json({
        success: true,
        message: "Payment released successfully"
      });

    } catch (err) {
      return res.json({
        success: false,
        message: err.message
      });
    }
  }

  /* =====================================================
     ✅ CLIENT — REQUEST REVISION
  ======================================================*/
  static async requestRevision(req, res) {
    try {
      const milestoneId = req.params.id;
      const { note } = req.body;

      const milestone = await Milestone.findById(milestoneId);

      if (!milestone || milestone.client.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: "Unauthorized" });

      if (!["submitted", "under-review"].includes(milestone.status))
        return res.status(400).json({
          success: false,
          message: "Milestone not in submitted state",
        });

      milestone.status = "revision-requested";
      milestone.notes = note;
      await milestone.save();

      return res.json({
        success: true,
        message: "Revision requested",
      });
    } catch (err) {
      winston.error("Request Revision Error: " + err.message);
      return res.status(500).json({ success: false, message: "Server Error" });
    }
  }

  /* =====================================================
     ✅ FREELANCER — RESUME AFTER REVISION
  ======================================================*/
  static async resume(req, res) {
    try {
      const milestoneId = req.params.id;

      const milestone = await Milestone.findById(milestoneId);

      if (milestone.freelancer.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: "Unauthorized" });

      if (milestone.status !== "revision-requested")
        return res.status(400).json({
          success: false,
          message: "Milestone not in revision state",
        });

      milestone.status = "in-progress";
      milestone.notes = "";
      await milestone.save();

      return res.json({
        success: true,
        message: "Milestone resumed",
      });
    } catch (err) {
      winston.error("Resume Milestone Error: " + err.message);
      return res.status(500).json({ success: false, message: "Server Error" });
    }
  }

  /* =====================================================
     ✅ CLIENT — OPEN DISPUTE
  ======================================================*/
 
// ✅ Client opens dispute
static async dispute(req, res) {
  try {
    const milestoneId = req.params.id;
    const { reason, description } = req.body;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Reason is required."
      });
    }

    const milestone = await Milestone.findById(milestoneId);

    if (!milestone) {
      return res.status(404).json({
        success: false,
        message: "Milestone not found."
      });
    }

    const ALLOWED = [
      "created",
      "funded",
      "in-progress",
      "submitted",
      "under-review",
      "revision-requested"
    ];

    console.log("DISPUTE CHECK — CURRENT STATUS:", milestone.status);

    if (!ALLOWED.includes(milestone.status)) {
      return res.status(400).json({
        success: false,
        message: "This milestone cannot be disputed now."
      });
    }

    // ✅ CREATE DISPUTE — ALL REQUIRED FIELDS INCLUDED
    const dispute = await Dispute.create({
      milestone: milestone._id,
      project: milestone.project,
      client: milestone.client,
      freelancer: milestone.freelancer,
      raisedBy: req.user._id,
      reason,
      description: description || null,
      status: "open",

      history: [
        {
          action: "dispute-opened",
          message: reason,
          actor: "client",
        },
      ],
    });

    // ✅ UPDATE MILESTONE STATUS
    milestone.status = "disputed";
    await milestone.save();

    return res.json({
      success: true,
      message: "✅ Dispute opened successfully",
      dispute
    });

  } catch (err) {
    console.error("DISPUTE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
}

static async viewProjectMilestones(req, res) {
  try {
    const projectId = req.params.id;

    const project = await Project.findOne({
      _id: projectId,
      client: req.user._id
    }).lean();

    if (!project) {
      return res.status(404).render("errors/404");
    }

    const milestones = await Milestone.find({
      project: projectId
    }).lean();

    res.render("pages/client/milestones", {
      layout: "layouts/client-layout",
      title: `${project.title} – Milestones`,
      project,
      milestones,
      razorpayKey: process.env.RAZORPAY_KEY_ID   
    });

  } catch (err) {
    console.error(err);
    res.status(500).render("errors/500");
  }
}






}

module.exports = MilestoneController;
