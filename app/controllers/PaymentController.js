// app/controllers/PaymentController.js
const Payment = require("../models/Payment");
const Project = require("../models/Project");
const User = require("../models/User");
const transporter = require("../config/mailer");
const winston = require("../config/winston");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

class PaymentController {

  //===========admin side===================
  /**
   * 🧾 User Payment History (for clients/freelancers)
   */
  static async history(req, res, next) {
    try {
      const payments = await Payment.find({
        $or: [{ client: req.user._id }, { freelancer: req.user._id }],
      }).populate("project");
      res.render("pages/payments", { layout: "layouts/main", payments });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 💼 Admin: View All Transactions + Summary
   */
  static async adminView(req, res, next) {
    try {
      const { status, method, search } = req.query;
      const match = {};

      if (status) match.status = status;
      if (method) match.paymentMethod = method;

      // Optional search by user or project
      if (search) {
        const users = await User.find({ fullName: new RegExp(search, "i") }, "_id");
        match.$or = [{ client: { $in: users } }, { freelancer: { $in: users } }];
      }

      const payments = await Payment.aggregate([
        { $match: match },
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
          $lookup: {
            from: "projects",
            localField: "project",
            foreignField: "_id",
            as: "project",
          },
        },
        { $unwind: "$project" },
        {
          $project: {
            amount: 1,
            status: 1,
            paymentMethod: 1,
            transactionId: 1,
            createdAt: 1,
            "clientName": "$client.fullName",
            "freelancerName": "$freelancer.fullName",
            "projectTitle": "$project.title",
          },
        },
        { $sort: { createdAt: -1 } },
      ]);

      // Aggregate for revenue report
      const report = await Payment.aggregate([
        { $match: { status: "released" } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
            totalTransactions: { $sum: 1 },
          },
        },
      ]);

      res.render("pages/admin/payments", {
        layout: "layouts/admin-layout",
        title: "Manage Payments",
        payments,
        report: report[0] || { totalRevenue: 0, totalTransactions: 0 },
        filters: { status, method, search },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 💰 Release Escrow Payment
   */
  static async releaseEscrow(req, res) {
    try {
      const payment = await Payment.findById(req.params.id).populate("freelancer project client");
      if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

      payment.status = "released";
      await payment.save();

      // Notify freelancer
      await transporter.sendMail({
        from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
        to: payment.freelancer.email,
        subject: "💸 Payment Released",
        html: `<h2>Hi ${payment.freelancer.fullName},</h2>
               <p>Your payment for <b>${payment.project.title}</b> has been released successfully.</p>`,
      });

      res.json({ success: true, message: "Payment released successfully." });
    } catch (err) {
      winston.error("Release Escrow Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error." });
    }
  }

  /**
   * ♻️ Refund Payment
   */
  static async refundPayment(req, res) {
    try {
      const payment = await Payment.findById(req.params.id).populate("client project");
      if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });

      payment.status = "refunded";
      await payment.save();

      await transporter.sendMail({
        from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
        to: payment.client.email,
        subject: "💳 Refund Processed",
        html: `<h2>Hi ${payment.client.fullName},</h2>
               <p>Your payment for <b>${payment.project.title}</b> has been refunded successfully.</p>`,
      });

      res.json({ success: true, message: "Refund completed successfully." });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error." });
    }
  }

  /**
   * 🧾 Process Withdrawal (for freelancers)
   */
  static async processWithdrawal(req, res) {
    try {
      const { id } = req.params;
      const payment = await Payment.findById(id).populate("freelancer project");
      if (!payment)
        return res.status(404).json({ success: false, message: "Withdrawal not found" });

      payment.status = "released";
      await payment.save();

      await transporter.sendMail({
        from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
        to: payment.freelancer.email,
        subject: "✅ Withdrawal Approved",
        html: `<h2>Hi ${payment.freelancer.fullName},</h2>
               <p>Your withdrawal for project <b>${payment.project.title}</b> has been processed successfully.</p>`,
      });

      res.json({ success: true, message: "Withdrawal processed successfully." });
    } catch (err) {
      res.status(500).json({ success: false, message: "Server error." });
    }
  }

  /*=================freelancer===============*/
  //===============Payment & Earning Module===============

  /**
   * 💵 View Freelancer Earnings Dashboard
   */
  static async freelancerEarnings(req, res, next) {
    try {
      const freelancerId = req.user._id;

      // Earnings summary
      const totalReleased = await Payment.aggregate([
        { $match: { freelancer: freelancerId, status: "released" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const totalPending = await Payment.aggregate([
        { $match: { freelancer: freelancerId, status: { $in: ["pending", "in-escrow"] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      // Transaction history
      const transactions = await Payment.find({ freelancer: freelancerId })
        .populate("project client", "title fullName")
        .sort({ createdAt: -1 });

      res.render("pages/freelancer/earnings", {
        layout: "layouts/freelancer-layout",
        title: "My Earnings",
        totalReleased: totalReleased[0]?.total || 0,
        totalPending: totalPending[0]?.total || 0,
        transactions,
      });
    } catch (err) {
      winston.error("Freelancer Earnings Error: " + err.message);
      next(err);
    }
  }

   /**
   * 💼 View escrow and pending payments (detailed)
   */
  static async viewEscrowPayments(req, res, next) {
    try {
      const freelancerId = req.user._id;

      const escrowPayments = await Payment.find({
        freelancer: freelancerId,
        status: { $in: ["pending", "in-escrow"] },
      })
        .populate("project client", "title fullName")
        .sort({ createdAt: -1 });

      res.render("pages/freelancer/escrow-payments", {
        layout: "layouts/freelancer-layout",
        title: "Escrow & Pending Payments",
        escrowPayments,
      });
    } catch (err) {
      winston.error("Escrow Payments Error: " + err.message);
      next(err);
    }
  }


  /**
   * 🧾 Filter transactions by status (AJAX)
   */
  static async filterPayments(req, res) {
    try {
      const freelancerId = req.user._id;
      const { status } = req.query;

      const payments = await Payment.find({
        freelancer: freelancerId,
        ...(status && status !== "all" ? { status } : {}),
      })
        .populate("project client", "title fullName")
        .sort({ createdAt: -1 });

      res.json({ success: true, payments });
    } catch (err) {
      winston.error("Filter Payments Error: " + err.message);
      res.status(500).json({ success: false, message: "Failed to filter payments" });
    }
  }

  /**
   * 🏦 Request Withdrawal
   */
  static async requestWithdrawal(req, res) {
    try {
      const { method, amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid amount" });
      }

      // Mock logic: create a withdrawal record (extend later)
      await Payment.create({
        freelancer: req.user._id,
        amount,
        status: "pending",
        paymentMethod: method,
      });

      res.json({ success: true, message: `Withdrawal of ₹${amount} requested via ${method}` });
    } catch (err) {
      winston.error("Withdrawal Request Error: " + err.message);
      res.status(500).json({ success: false, message: "Failed to request withdrawal" });
    }
  }

  /**
   * 📄 Download Invoice PDF
   */
  static async downloadInvoice(req, res) {
    try {
      const payment = await Payment.findById(req.params.id)
        .populate("project client freelancer", "title fullName email");

      if (!payment || payment.freelancer._id.toString() !== req.user._id.toString()) {
        return res.status(403).send("Access denied");
      }

      const doc = new PDFDocument();
      const invoicePath = path.join(__dirname, `../../invoices/invoice-${payment._id}.pdf`);
      doc.pipe(fs.createWriteStream(invoicePath));

      doc.fontSize(20).text("Freelancer Marketplace", { align: "center" });
      doc.moveDown();
      doc.fontSize(14).text(`Invoice ID: ${payment._id}`);
      doc.text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`);
      doc.moveDown();
      doc.text(`Client: ${payment.client.fullName}`);
      doc.text(`Project: ${payment.project.title}`);
      doc.text(`Freelancer: ${payment.freelancer.fullName}`);
      doc.moveDown();
      doc.text(`Amount: ₹${payment.amount}`);
      doc.text(`Status: ${payment.status}`);
      doc.end();

      doc.on("finish", () => {
        res.download(invoicePath, `invoice-${payment._id}.pdf`, () => {
          fs.unlinkSync(invoicePath);
        });
      });
    } catch (err) {
      winston.error("Invoice Download Error: " + err.message);
      res.status(500).send("Error generating invoice");
    }
  }

  /**
   * 🔄 Get Updated Earnings (AJAX refresh)
   */
  static async getEarningsData(req, res) {
    try {
      const freelancerId = req.user._id;

      const totalReleased = await Payment.aggregate([
        { $match: { freelancer: freelancerId, status: "released" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const totalPending = await Payment.aggregate([
        { $match: { freelancer: freelancerId, status: { $in: ["pending", "in-escrow"] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      res.json({
        success: true,
        data: {
          released: totalReleased[0]?.total || 0,
          pending: totalPending[0]?.total || 0,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to load earnings data" });
    }
  }


  /* ---------------------------------------------------------------------
     💰 CLIENT: PAYMENT & ESCROW MODULE
  --------------------------------------------------------------------- */

  // Deposit funds into escrow
  static async depositEscrow(req, res) {
    try {
      const { projectId, amount, method } = req.body;
      const clientId = req.user._id;

      await Payment.create({
        project: projectId,
        client: clientId,
        amount,
        status: "in-escrow",
        paymentMethod: method,
      });

      res.json({ success: true, message: "Funds deposited to escrow successfully!" });
    } catch (err) {
      winston.error("Deposit Escrow Error: " + err.message);
      res.status(500).json({ success: false, message: "Error depositing escrow" });
    }
  }

  // Release payment to freelancer
  static async releasePayment(req, res) {
    try {
      const payment = await Payment.findById(req.params.id);
      if (!payment || payment.status !== "in-escrow")
        return res.status(400).json({ success: false, message: "Invalid payment status" });

      payment.status = "released";
      await payment.save();

      res.json({ success: true, message: "Payment released to freelancer!" });
    } catch (err) {
      winston.error("Release Payment Error: " + err.message);
      res.status(500).json({ success: false, message: "Error releasing payment" });
    }
  }

  // Request refund
  static async requestRefund(req, res) {
    try {
      const payment = await Payment.findById(req.params.id);
      if (!payment || payment.status !== "in-escrow")
        return res.status(400).json({ success: false, message: "Cannot refund this payment" });

      payment.status = "refunded";
      await payment.save();

      res.json({ success: true, message: "Refund requested successfully!" });
    } catch (err) {
      winston.error("Refund Request Error: " + err.message);
      res.status(500).json({ success: false, message: "Failed to request refund" });
    }
  }

  // View transaction history (client)
  static async clientPayments(req, res, next) {
    try {
      const clientId = req.user._id;

      const payments = await Payment.find({ client: clientId })
        .populate("project freelancer", "title fullName")
        .sort({ createdAt: -1 });

      res.render("pages/client/payments", {
        layout: "layouts/client-layout",
        title: "Payments & Transactions",
        payments,
      });
    } catch (err) {
      winston.error("Client Payments Error: " + err.message);
      next(err);
    }
  }


  
}

module.exports = PaymentController;
