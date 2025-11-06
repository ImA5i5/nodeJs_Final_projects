// app/controllers/DisputeController.js
const mongoose = require("mongoose");
const Dispute = require("../models/Dispute");
const Payment = require("../models/Payment");
const transporter = require("../config/mailer");
const winston = require("../config/winston");

class DisputeController {
  /**
   * 🧾 View All Disputes (Aggregation + Filters)
   */
  static async viewAll(req, res, next) {
    try {
      const { status, search } = req.query;
      const match = {};

      if (status) match.status = status;
      if (search) {
        match.$or = [
          { reason: new RegExp(search, "i") },
          { description: new RegExp(search, "i") },
        ];
      }

      // Aggregation to fetch disputes with project/client/freelancer details
      const disputes = await Dispute.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "projects",
            localField: "project",
            foreignField: "_id",
            as: "project",
          },
        },
        { $unwind: "$project" },
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $lookup: {
            from: "users",
            localField: "freelancer",
            foreignField: "_id",
            as: "freelancer",
          },
        },
        { $unwind: "$freelancer" },
        {
          $project: {
            _id: 1,
            reason: 1,
            status: 1,
            createdAt: 1,
            "projectTitle": "$project.title",
            "clientName": "$client.fullName",
            "freelancerName": "$freelancer.fullName",
          },
        },
        { $sort: { createdAt: -1 } },
      ]);

      // Summary by status (for dashboard cards)
      const summary = await Dispute.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      res.render("pages/admin/disputes", {
        layout: "layouts/admin-layout",
        title: "Dispute Management",
        disputes,
        summary,
        filters: { status, search },
      });
    } catch (err) {
      winston.error("View All Disputes Error: " + err.message);
      next(err);
    }
  }

  /**
   * 🧠 Handle Dispute (Admin communication + decision)
   */
  static async handleDispute(req, res) {
    try {
      const { id } = req.params;
      const { resolution, action } = req.body;

      // Fetch dispute with joined details
      const [dispute] = await Dispute.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(id) } },
        {
          $lookup: {
            from: "projects",
            localField: "project",
            foreignField: "_id",
            as: "project",
          },
        },
        { $unwind: "$project" },
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $lookup: {
            from: "users",
            localField: "freelancer",
            foreignField: "_id",
            as: "freelancer",
          },
        },
        { $unwind: "$freelancer" },
      ]);

      if (!dispute)
        return res.status(404).json({ success: false, message: "Dispute not found." });

      // Update status and log history
      const update = {
        $set: {
          status: action === "resolve" ? "resolved" : "in-review",
          resolution,
        },
        $push: {
          history: {
            action: action === "resolve" ? "Resolved" : "Marked In-Review",
            message: resolution,
            actor: "admin",
            timestamp: new Date(),
          },
        },
      };

      await Dispute.updateOne({ _id: new mongoose.Types.ObjectId(id) }, update);

      // Send emails to both parties
      const subject =
        action === "resolve" ? "✅ Dispute Resolved" : "🕊️ Dispute Under Review";

      await Promise.all([
        transporter.sendMail({
          from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
          to: dispute.client.email,
          subject,
          html: `<p>Dear ${dispute.client.fullName},</p>
                 <p>Your dispute for project <b>${dispute.project.title}</b> has been updated.</p>
                 <p>Status: ${update.$set.status}</p>
                 <p>Admin Message: ${resolution}</p>`,
        }),
        transporter.sendMail({
          from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
          to: dispute.freelancer.email,
          subject,
          html: `<p>Dear ${dispute.freelancer.fullName},</p>
                 <p>A dispute involving project <b>${dispute.project.title}</b> has been updated.</p>
                 <p>Status: ${update.$set.status}</p>
                 <p>Admin Message: ${resolution}</p>`,
        }),
      ]);

      res.json({
        success: true,
        message: `Dispute ${action === "resolve" ? "resolved" : "updated"} successfully.`,
      });
    } catch (err) {
      winston.error("Handle Dispute Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error occurred." });
    }
  }

  /**
   * 💸 Approve Refund or Release Payment
   */
  static async processRefundOrPayment(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body; // refund or release

      // Fetch dispute with linked project and users
      const [dispute] = await Dispute.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(id) } },
        {
          $lookup: {
            from: "projects",
            localField: "project",
            foreignField: "_id",
            as: "project",
          },
        },
        { $unwind: "$project" },
        {
          $lookup: {
            from: "users",
            localField: "client",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $lookup: {
            from: "users",
            localField: "freelancer",
            foreignField: "_id",
            as: "freelancer",
          },
        },
        { $unwind: "$freelancer" },
      ]);

      if (!dispute)
        return res.status(404).json({ success: false, message: "Dispute not found." });

      const payment = await Payment.findOne({ project: dispute.project._id });
      if (!payment)
        return res.status(404).json({ success: false, message: "Payment not found." });

      const updateOps = {};
      let adminActionText;

      if (action === "refund") {
        payment.status = "refunded";
        adminActionText = "Refund approved to client";
      } else {
        payment.status = "released";
        adminActionText = "Payment released to freelancer";
      }

      await payment.save();

      await Dispute.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        {
          $set: {
            status: "resolved",
            resolution:
              action === "refund"
                ? "Admin approved refund to client."
                : "Admin released payment to freelancer.",
          },
          $push: {
            history: {
              action: action === "refund" ? "Refund Approved" : "Payment Released",
              message:
                action === "refund"
                  ? "Refund approved to client."
                  : "Payment released to freelancer.",
              actor: "admin",
              timestamp: new Date(),
            },
          },
        }
      );

      await transporter.sendMail({
        from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
        to: action === "refund" ? dispute.client.email : dispute.freelancer.email,
        subject: action === "refund" ? "💳 Refund Approved" : "💸 Payment Released",
        html: `<p>Project: <b>${dispute.project.title}</b></p>
               <p>The admin has processed a ${action === "refund" ? "refund" : "payment release"} related to your dispute.</p>`,
      });

      res.json({ success: true, message: adminActionText });
    } catch (err) {
      winston.error("Refund/Release Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error occurred." });
    }
  }

  /**
   * 🕒 View Dispute History (Aggregation)
   */
static async viewHistory(req, res) {
  const { id } = req.params; // e.g., dispute ID from the URL
  const dispute = await Dispute.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(id) } },
    {
      $lookup: {
        from: "projects",
        localField: "project",
        foreignField: "_id",
        as: "project",
      },
    },
    { $unwind: "$project" },
    {
      $lookup: {
        from: "users",
        localField: "client",
        foreignField: "_id",
        as: "client",
      },
    },
    { $unwind: "$client" },
    {
      $lookup: {
        from: "users",
        localField: "freelancer",
        foreignField: "_id",
        as: "freelancer",
      },
    },
    { $unwind: "$freelancer" },
    {
      $project: {
        projectTitle: "$project.title",
        clientName: "$client.fullName",
        freelancerName: "$freelancer.fullName",
        status: 1,
        resolution: 1,
        history: 1,
        createdAt: 1,
      },
    },
  ]);

  res.render("pages/admin/dispute-history", {
    layout: "layouts/admin-layout",
    title: "Dispute History",
    dispute: dispute[0],
  });
}

}

module.exports = DisputeController;
