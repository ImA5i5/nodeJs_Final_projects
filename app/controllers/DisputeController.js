// app/controllers/DisputeController.js
const Dispute = require("../models/Dispute");
const Milestone = require("../models/Milestone");
const NotificationService = require("../services/NotificationService");
const PaymentService = require("../services/PaymentService");
const Message = require("../models/Message");
const ChatRoom = require("../models/ChatRoom");

class DisputeController {

  /* ---------------------------------------------------------
    ✅ Client Raises Milestone Dispute
  ----------------------------------------------------------*/
  static async raise(req, res) {
    try {
      const { milestoneId, reason } = req.body;

      const milestone = await Milestone.findById(milestoneId);
      if (!milestone)
        return res.json({ success: false, message: "Milestone not found" });

      if (milestone.client.toString() !== req.user._id.toString())
        return res.json({ success: false, message: "Unauthorized" });

      // ✅ Create dispute
      const dispute = await Dispute.create({
        milestone: milestoneId,
        raisedBy: req.user._id,
        reason,
        status: "open"
      });

      // ✅ Update milestone status
      milestone.status = "disputed";
      await milestone.save();

      // ✅ Notify freelancer
      await NotificationService.create({
        user: milestone.freelancer,
        title: "Milestone Disputed",
        message: `Client disputed milestone "${milestone.title}".`
      });

      // ✅ Notify admin
      await NotificationService.create({
        user: "ADMIN",
        title: "New Dispute Raised",
        message: `Milestone dispute created for ${milestone.title}.`
      });

      return res.json({ success: true, message: "Dispute created", dispute });

    } catch (err) {
      return res.json({ success: false, message: err.message });
    }
  }


  /* ---------------------------------------------------------
    ✅ ADMIN — List all disputes
  ----------------------------------------------------------*/
  static async list(req, res) {
    const disputes = await Dispute.find()
      .populate("milestone raisedBy")
      .sort({ createdAt: -1 });

    return res.render("pages/admin/disputes", {
      layout: "layouts/admin-layout",
      disputes
    });
  }


  /* ---------------------------------------------------------
    ✅ ADMIN — Resolve dispute (refund | release | request-info)
  ----------------------------------------------------------*/
 static async resolve(req, res) {
    try {
      const { disputeId, action, note } = req.body; // action: 'refund-client' | 'release-freelancer' | 'need-info'
      const dispute = await Dispute.findById(disputeId).populate("milestone");
      if (!dispute) return res.status(404).json({ success: false, message: "Dispute not found" });

      const milestone = await Milestone.findById(dispute.milestone);
      if (!milestone) return res.status(404).json({ success: false, message: "Milestone not found" });

      if (action === "refund-client") {
        await PaymentService.refundEscrow(milestone._id, req.user, note || "Admin refund");
        dispute.status = "resolved";
        dispute.resolution = "refund-client";
      } else if (action === "release-freelancer") {
        await PaymentService.releasePayment(
          { _id: milestone.client },           // pseudo client user for auth check
          milestone.freelancer,
          milestone._id,
          milestone.amount
        );
        milestone.status = "completed";
        await milestone.save();

        dispute.status = "resolved";
        dispute.resolution = "release-freelancer";
      } else {
        // need-info
        dispute.status = "in-review";
        dispute.resolution = "need-info";
      }

      dispute.history.push({
        action: "admin-resolution",
        actor: "admin",
        message: note || action
      });
      await dispute.save();

      return res.json({ success: true, message: "Dispute updated" });
    } catch (err) {
      winston.error("Resolve Dispute Error: " + err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = DisputeController;
