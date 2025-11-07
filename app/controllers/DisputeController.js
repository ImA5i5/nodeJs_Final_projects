// app/controllers/DisputeController.js
const Dispute = require("../models/Dispute");
const Milestone = require("../models/Milestone");
const EmailService = require("../services/email.service");

class DisputeController {
  // ✅ Client raises dispute
  static async raise(req, res) {
    try {
      const { milestoneId, reason } = req.body;

      const dispute = await Dispute.create({
        milestone: milestoneId,
        raisedBy: req.user._id,
        reason,
        status: "open",
      });

      await Milestone.findByIdAndUpdate(milestoneId, { status: "disputed" });

      EmailService.sendNotification(
        process.env.ADMIN_EMAIL,
        "⚠️ New Dispute Raised",
        `A dispute was raised for milestone ${milestoneId}`
      );

      res.json({ success: true, message: "Dispute created", dispute });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ✅ Admin: list all disputes
  static async list(req, res) {
    const disputes = await Dispute.find()
      .populate("milestone raisedBy")
      .sort({ createdAt: -1 });

    res.render("pages/admin/disputes", {
      layout: "layouts/admin-layout",
      disputes
    });
  }

  // ✅ Admin: resolve dispute
  static async resolve(req, res) {
    try {
      const { disputeId, resolution } = req.body;

      const dispute = await Dispute.findById(disputeId)
        .populate("milestone");

      dispute.status = "resolved";
      dispute.resolution = resolution;
      await dispute.save();

      res.json({ success: true, message: "Dispute resolved" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = DisputeController;
