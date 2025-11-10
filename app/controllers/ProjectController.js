// app/controllers/ProjectController.js
const Project = require("../models/Project");
const Bid = require("../models/Bid");
const User = require("../models/User");
const mongoose = require("mongoose");
const Category = require("../models/Category");
const Review = require("../models/Review");
const Milestone = require("../models/Milestone");
const EmailService = require("../services/email.service");
const cloudinary = require("../config/cloudinary");
const transporter = require("../config/mailer");
const winston = require("../config/winston"); 

class ProjectController {

  /*===============Client section================*/

  // 👀 View Deliverables
  static async viewDeliverables(req, res) {
    try {
      const project = await Project.findById(req.params.id);

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      return res.json({
        success: true,
        deliverables: project.deliverables || [],
      });
    } catch (err) {
      winston.error("View Deliverables Error: " + err.message);
      return res.status(500).json({
        success: false,
        message: "Error fetching deliverables",
      });
    }
  }

  // ✅ Approve Project (submitted → completed)
 static async approveProject(req, res) {
    try {
      const project = await Project.findById(req.params.id).populate("hiredFreelancer client");

      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      if (project.status !== "submitted") {
        return res.status(400).json({ success: false, message: "Project not in submitted state." });
      }

      console.log("Before save - status:", project.status);

      // ✅ FIX — change to 'completed'
      project.status = "completed";
      project.completedAt = new Date();
      await project.save();

      console.log("After save - status:", project.status);

      // ✅ Notify freelancer
      await EmailService.sendNotification(
        project.hiredFreelancer.email,
        `✅ Project "${project.title}" Completed!`,
        `
        <p>Hi ${project.hiredFreelancer.fullName},</p>
        <p>The client <b>${project.client.fullName}</b> has approved and marked your project <b>${project.title}</b> as completed.</p>
        <p>Congratulations on finishing successfully 🎉</p>
        `
      );

      return res.json({
        success: true,
        message: "Project approved and marked as completed! Freelancer has been notified.",
      });
    } catch (err) {
      winston.error("Approve Project Error:", err.message);
      return res.status(500).json({ success: false, message: "Error approving project" });
    }
  }

  // 🔁 Request Revisions (submitted → in-progress)
  static async requestRevision(req, res) {
    try {
      const project = await Project.findById(req.params.id).populate("hiredFreelancer client");

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      if (project.status !== "submitted") {
        return res.status(400).json({
          success: false,
          message: "Project must be in submitted state to request changes.",
        });
      }

      // ✅ Update project status
      project.status = "in-progress";
      project.revisionRequestedAt = new Date();
      await project.save();

      // ✅ Notify Freelancer via Email
      const subject = `🔁 Revision Requested for Project "${project.title}"`;
      const message = `
        <p>Hello ${project.hiredFreelancer.fullName},</p>
        <p>The client <b>${project.client.fullName}</b> has requested revisions for your project <b>${project.title}</b>.</p>
        <p>Please log in to your dashboard to review the feedback and update your deliverables.</p>
      `;
      await EmailService.sendNotification(project.hiredFreelancer.email, subject, message);

      winston.info(`Revision requested for project ${project._id}`);

      return res.json({
        success: true,
        message: "Revision requested successfully! Freelancer has been notified.",
      });
    } catch (err) {
      winston.error("Request Revision Error: " + err.message);
      return res.status(500).json({
        success: false,
        message: "Error requesting revision",
      });
    }
  }
  /*================📈 Project Management Module============*/
  // 🧭 View full project details + progress + chat
  static async clientViewProject(req, res, next) {
    try {
      const project = await Project.findById(req.params.id)
        .populate("hiredFreelancer client category")
        .lean();

      const milestones = await Milestone.find({ project: project._id }).lean();

      const progress =
        milestones.length > 0
          ? Math.round(
              (milestones.filter((m) => m.status === "completed").length /
                milestones.length) *
                100
            )
          : 0;

      res.render("pages/client/manage-project", {
        layout: "layouts/client-layout",
        title: `Manage Project - ${project.title}`,
        project,
        milestones,
        progress,
        user: req.user,
      });
    } catch (err) {
      next(err);
    }
  }

  // ✅ Approve milestone completion
  static async approveMilestone(req, res) {
    try {
      const milestone = await Milestone.findById(req.params.id);
      if (!milestone)
        return res.status(404).json({ success: false, message: "Milestone not found" });

      milestone.status = "approved";
      await milestone.save();

      await Notification.create({
        user: milestone.freelancer,
        message: `Client approved your milestone: ${milestone.title}`,
        type: "project",
      });

      res.json({ success: true, message: "Milestone approved successfully!" });
    } catch (err) {
      winston.error("Approve Milestone Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // 🔁 Request revision
  static async requestRevision(req, res) {
    try {
      const { message } = req.body;
      const milestone = await Milestone.findById(req.params.id);
      if (!milestone)
        return res.status(404).json({ success: false, message: "Milestone not found" });

      milestone.status = "revision-requested";
      await milestone.save();

      await Notification.create({
        user: milestone.freelancer,
        message: `Client requested revisions for milestone: ${milestone.title}`,
        type: "project",
      });

      res.json({ success: true, message: "Revision request sent to freelancer." });
    } catch (err) {
      winston.error("Request Revision Error: " + err.message);
      res.status(500).json({ success: false, message: "Failed to send revision request" });
    }
  }

  // 📤 Send message in project chat (AJAX)
  static async sendProjectMessage(req, res) {
    try {
      const { text } = req.body;
      const project = await Project.findById(req.params.id);
      if (!project)
        return res.status(404).json({ success: false, message: "Project not found" });

      const msg = await Message.create({
        project: project._id,
        sender: req.user._id,
        receiver: project.hiredFreelancer,
        content: text,
      });

      await Notification.create({
        user: project.hiredFreelancer,
        message: `${req.user.fullName} sent a new message on project "${project.title}"`,
        type: "message",
      });

      res.json({ success: true, message: msg });
    } catch (err) {
      winston.error("Project Chat Error: " + err.message);
      res.status(500).json({ success: false, message: "Failed to send message" });
    }
  }

  // 🏁 Close project
  static async closeProject(req, res) {
    try {
      const project = await Project.findById(req.params.id);
      if (!project)
        return res.status(404).json({ success: false, message: "Project not found" });

      project.status = "completed";
      await project.save();

      await Notification.create({
        user: project.hiredFreelancer,
        message: `Project "${project.title}" has been marked as completed by the client.`,
        type: "project",
      });

      res.json({ success: true, message: "Project marked as completed!" });
    } catch (err) {
      winston.error("Close Project Error: " + err.message);
      res.status(500).json({ success: false, message: "Error closing project" });
    }
  }

  /*==========📝 Project Posting Module============*/
  /**
   * 📋 View all projects posted by the client
   */
 /**
   * 📁 View all projects posted by the client
   */
  static async viewMyProjects(req, res, next) {
    try {
      const clientId = req.user._id;

      // Fetch all projects for the logged-in client
      let projects = await Project.find({ client: clientId })
        .populate("hiredFreelancer", "fullName")
        .sort({ createdAt: -1 })
        .lean();

      // ✅ For each project, check if a review exists
      const projectIds = projects.map((p) => p._id);
      const reviews = await Review.find({ project: { $in: projectIds }, client: clientId }).lean();

      // Add a "reviewed" flag for each project
      projects = projects.map((p) => {
        const hasReview = reviews.some((r) => r.project.toString() === p._id.toString());
        return { ...p, reviewed: hasReview };
      });

      res.render("pages/client/my-projects", {
        layout: "layouts/client-layout",
        title: "My Projects",
        projects,
      });
    } catch (err) {
      winston.error("View My Projects Error: " + err.message);
      next(err);
    }
  }

  /**
   * 🆕 Render Create Project Form
   */
    static async renderCreateProject(req, res, next) {
    try {
      // ✅ Fetch only approved categories + subcategories
      const categories = await Category.find({ isApproved: true })
        .select("name subcategories")
        .lean();

      res.render("pages/client/post-project", {
        layout: "layouts/client-layout",
        title: "Post a New Project",
        categories, // 👈 Pass to EJS for dropdown
      });
    } catch (err) {
      winston.error("Render Create Project Error: " + err.message);
      next(err);
    }
  }

  /**
   * 💾 Create New Project (with attachments + payment type)
   */
static async createProject(req, res, next) {
  try {
    const { title, description, category, subcategory, budget, duration, paymentType } = req.body;

    // Collect already uploaded file URLs
    const uploadedFiles = req.files ? req.files.map((file) => file.path) : [];

    const project = await Project.create({
      client: req.user._id,
      title,
      description,
      category,
      subcategory,
      budget,
      duration,
      paymentType,
      attachments: uploadedFiles,
      status: "pending",
    });

    res.json({ success: true, message: "✅ Project created successfully!", project });
  } catch (err) {
    console.error("Create Project Error:", err.message);
    res.status(500).json({ success: false, message: "Server error creating project" });
  }
}



  /**
   * ✏️ Render Edit Project Form
   */
  static async renderEditProject(req, res, next) {
  try {
    const project = await Project.findById(req.params.id);
    if (!project || project.client.toString() !== req.user._id.toString()) {
      return res.status(403).render("errors/403", { message: "Unauthorized" });
    }

    res.render("pages/client/edit-project", {
      layout: "layouts/client-layout",
      title: "Edit Project",
      project,
    });
  } catch (err) {
    next(err);
  }
}

  /**
   * 🔁 Update Project (with optional re-attachments)
   */
 static async updateProject(req, res, next) {
    try {
      console.log("🟡 Incoming PUT request for project update");
      console.log("🟡 Params ID:", req.params.id);
      console.log("🟡 Body:", req.body);
      console.log("🟡 Files:", req.files);

      const { title, description, category, budget, duration, paymentType } = req.body;

      const project = await Project.findOne({
        _id: req.params.id,
        client: req.user._id,
      });

      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      // 🔹 Handle file deletions
      let existingFiles = project.attachments || [];
      if (req.body.removeFiles && typeof req.body.removeFiles === "string") {
        // removeFiles sent as comma-separated URLs
        const filesToRemove = req.body.removeFiles.split(",");
        for (const fileUrl of filesToRemove) {
          try {
            const publicId = fileUrl.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`client_project_attachments/${publicId}`);
            existingFiles = existingFiles.filter((f) => f !== fileUrl);
          } catch (err) {
            console.warn("⚠️ Cloudinary deletion failed for:", fileUrl);
          }
        }
      }

      // 🔹 Handle new uploads
      let newUploads = [];
      if (req.files && req.files.length > 0) {
        const uploads = await Promise.all(
          req.files.map(async (file) => {
            const result = await cloudinary.uploader.upload(file.path, {
              folder: "client_project_attachments",
              resource_type: "auto",
            });
            return result.secure_url;
          })
        );
        newUploads = uploads;
      }

      const finalAttachments = [...existingFiles, ...newUploads];

      // 🔹 Prepare data
      const updateData = {
        title,
        description,
        budget,
        duration,
        paymentType,
        attachments: finalAttachments,
      };

      if (mongoose.Types.ObjectId.isValid(category)) {
        updateData.category = category;
      }

      Object.assign(project, updateData);
      await project.save();

      console.log("✅ Project updated successfully");
      res.json({ success: true, message: "Project updated successfully" });
    } catch (err) {
      console.error("❌ Update Project Error:", err);
      winston.error("Update Project Error:", err.message);
      res.status(500).json({
        success: false,
        message: "Server error updating project",
        error: err.message,
      });
    }
  }


  /**
   * ❌ Delete Project
   */
 static async deleteProject(req, res) {
  try {
    const project = await Project.findById(req.params.id);
    if (!project || project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized action" });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
}
  

  /* ------------------ FREELANCER SECTION ------------------ */

  static async submitForApproval(req, res) {
  try {
    console.log("📨 Submit endpoint hit for project:", req.params.id);
    console.log("Freelancer submitting:", req.user?._id);

    const project = await Project.findById(req.params.id).populate("client hiredFreelancer");

    if (!project) {
      console.log("❌ Project not found");
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    // ✅ Ensure only the assigned freelancer can submit
    if (project.hiredFreelancer?._id.toString() !== req.user._id.toString()) {
      console.log("🚫 Unauthorized freelancer tried to submit project");
      return res.status(403).json({ success: false, message: "You are not authorized to submit this project." });
    }

    // ✅ Only allow submission from "in-progress"
    if (project.status !== "in-progress") {
      console.log("⚠️ Invalid status for submission:", project.status);
      return res.status(400).json({ success: false, message: "Project is not in progress or already submitted." });
    }

    // ✅ Change status to "submitted"
    project.status = "submitted";
    project.submittedAt = new Date();

    await project.save();

    console.log("✅ Project updated to:", project.status);

    // ✅ Notify client via email
    await EmailService.sendNotification(
      project.client.email,
      `📦 Project "${project.title}" Submitted for Your Approval`,
      `
      <p>Dear ${project.client.fullName},</p>
      <p>The freelancer <b>${project.hiredFreelancer.fullName}</b> has submitted the project <b>${project.title}</b> for your review.</p>
      <p>Please log in to your client dashboard to <b>review deliverables</b> and either approve or request changes.</p>
      `
    );

    return res.json({
      success: true,
      message: "✅ Project submitted successfully! Client has been notified to review your work.",
    });
  } catch (err) {
    console.error("❌ Submit For Approval Error:", err.message);
    return res.status(500).json({ success: false, message: "Error submitting project" });
  }
}

  /*💼 Project Browsing & Bidding Module*/

   // 🧾 Freelancer: View My Bids
    static async myBids(req, res, next) {
    try {
      const bids = await Bid.find({ freelancer: req.user._id })
        .populate("project", "title budget status")
        .sort({ createdAt: -1 })
        .lean();

      res.render("pages/freelancer/my-bids", {
        layout: "layouts/freelancer-layout",
        title: "My Bids",
        bids,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * 🧭 Browse available projects (with filters)
   * Supports query params:
   *   - category
   *   - minBudget / maxBudget
   *   - search (keyword in title/description)
   */
// Freelancer: Browse approved projects with filters
  static async browse(req, res, next) {
  try {
    const { category, minBudget, maxBudget, search } = req.query;

    const query = { status: "approved", isActive: true };

    if (category && category !== "all") query.category = category;

    if (minBudget || maxBudget) {
      query.budget = {};
      if (minBudget) query.budget.$gte = Number(minBudget);
      if (maxBudget) query.budget.$lte = Number(maxBudget);
    }

    if (search) {
      query.$or = [
        { title: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
      ];
    }

    console.log("🔍 Freelancer project search query:", query);

    const projects = await Project.find(query)
      .populate("category client", "name fullName email")
      .sort({ createdAt: -1 })
      .lean();

    const categories = await Category.find().select("name").lean();

    res.render("pages/freelancer/browse-projects", {
      layout: "layouts/freelancer-layout",
      title: "Browse Projects",
      projects,
      categories,
      filters: { category, minBudget, maxBudget, search },
    });
  } catch (err) {
    console.error("❌ Browse Projects Error:", err);
    next(err);
  }
}



  /**
   * 📨 Submit Proposal (Bid)
   */
static async placeBid(req, res, next) {
  try {
    const { projectId, bidAmount, deliveryTime, coverLetter } = req.body;

    // ✅ Prevent duplicate bids
    const existingBid = await Bid.findOne({
      project: projectId,
      freelancer: req.user._id,
    });

    if (existingBid) {
      return res.status(400).json({
        success: false,
        message: "You have already submitted a bid for this project.",
      });
    }

    const bid = await Bid.create({
      project: projectId,
      freelancer: req.user._id,
      bidAmount, // ✅ CORRECT FIELD NAME
      deliveryTime,
      coverLetter,
      status: "pending",
    });

    return res.json({
      success: true,
      message: "Bid submitted successfully!",
      bid,
    });
  } catch (err) {
    console.error("Create Bid Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Server error submitting bid",
    });
  }
}


  /**
   * 📋 View & Manage Sent Proposals
   */
  static async myBids(req, res, next) {
  try {
    const bids = await Bid.find({ freelancer: req.user._id })
      .populate({
        path: "project",
        populate: { path: "client", select: "fullName email" },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.render("pages/freelancer/my-bids", {
      layout: "layouts/freelancer-layout",
      title: "My Bids",
      bids,
    });
  } catch (err) {
    console.error("My Bids Error:", err.message);
    next(err);
  }
}

   
  /**
   * ✏️ Edit an existing bid (AJAX)
   */
  static async editBid(req, res, next) {
    try {
      const { id } = req.params;
      const { bidAmount, deliveryTime, coverLetter } = req.body;

      const bid = await Bid.findOneAndUpdate(
        { _id: id, freelancer: req.user._id },
        { bidAmount, deliveryTime, coverLetter },
        { new: true }
      );

      if (!bid)
        return res.status(404).json({ success: false, message: "Bid not found or unauthorized." });

      return res.json({
        success: true,
        message: "Bid updated successfully!",
        bid,
      });
    } catch (err) {
      next(err);
    }
  }

  

   /**
   * ❌ Withdraw a bid (AJAX)
   */
  static async withdrawBid(req, res, next) {
    try {
      const { id } = req.params;

      const bid = await Bid.findOneAndDelete({ _id: id, freelancer: req.user._id });

      if (!bid)
        return res.status(404).json({ success: false, message: "Bid not found or unauthorized." });

      return res.json({
        success: true,
        message: "Bid withdrawn successfully!",
      });
    } catch (err) {
      next(err);
    }
  }

  /*-----------🧾 Project Work & Delivery Module-----------*/

  // View all assigned projects for freelancer
  static async myProjects(req, res, next) {
    try {
      const projects = await Project.find({ hiredFreelancer: req.user._id })
        .populate("client category")
        .sort({ createdAt: -1 });

      res.render("pages/freelancer/my-projects", {
        layout: "layouts/freelancer-layout",
        projects,
      });
    } catch (err) {
      next(err);
    }
  }

   // Freelancer accepts assigned project
  static async acceptProject(req, res) {
    try {
      const project = await Project.findById(req.params.id);
      if (!project || project.hiredFreelancer.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: "Not authorized" });

      project.status = "in-progress";
      await project.save();

      res.json({ success: true, message: "Project accepted successfully!" });
    } catch (err) {
      winston.error("Accept Project Error:", err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /* ------------------ MILESTONES ------------------ */
  // 📋 View All Milestones for Freelancer
static async viewAllMilestones(req, res, next) {
  try {
    const milestones = await Milestone.aggregate([
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
        $match: {
          "project.hiredFreelancer": req.user._id,
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          dueDate: 1,
          status: 1,
          projectTitle: "$project.title",
        },
      },
      { $sort: { dueDate: 1 } },
    ]);

    res.render("pages/freelancer/milestones", {
      layout: "layouts/freelancer-layout",
      title: "My Milestones",
      milestones,
    });
  } catch (err) {
    next(err);
  }
}


  static async addMilestone(req, res) {
    try {
      const { title, dueDate, description } = req.body;
      const projectId = req.params.projectId;

      const milestone = new Milestone({
        project: projectId,
        title,
        dueDate,
        description,
        status: "pending",
      });
      await milestone.save();

      res.json({ success: true, message: "Milestone added", milestone });
    } catch (err) {
      res.status(500).json({ success: false, message: "Error creating milestone" });
    }
  }

  static async completeMilestone(req, res) {
    try {
      const milestone = await Milestone.findById(req.params.id);
      if (!milestone) return res.status(404).json({ success: false, message: "Not found" });

      milestone.status = "completed";
      await milestone.save();
      res.json({ success: true, message: "Milestone marked completed" });
    } catch (err) {
      res.status(500).json({ success: false, message: "Error updating milestone" });
    }
  }


  /* ------------------ UPLOAD DELIVERABLES ------------------ */

  static async uploadDeliverables(req, res) {
    try {
      const project = await Project.findById(req.params.id);
      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      const uploadResults = await Promise.all(
        req.files.map((file) =>
          cloudinary.uploader.upload(file.path, { folder: "freelancer_deliverables" })
        )
      );

      const uploadedUrls = uploadResults.map((f) => f.secure_url);
      project.attachments.push(...uploadedUrls);
      await project.save();

      res.json({ success: true, message: "Deliverables uploaded successfully." });
    } catch (err) {
      winston.error("Upload Deliverables Error:", err.message);
      res.status(500).json({ success: false, message: "Error uploading files" });
    }
  }

  /* ------------------ SUBMIT FOR CLIENT APPROVAL ------------------ */
 
  static async submitForApproval(req, res) {
  try {
    console.log("📨 Submit endpoint hit for project:", req.params.id);
    console.log("Freelancer submitting:", req.user?._id);

    const project = await Project.findById(req.params.id).populate("client hiredFreelancer");

    if (!project) {
      console.log("❌ Project not found");
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    console.log("✅ Found project:", project.title);
    console.log("Current status before update:", project.status);
    console.log("Hired freelancer ID:", project.hiredFreelancer?._id.toString());
    console.log("Submitting freelancer ID:", req.user._id.toString());

    // ✅ Ensure only assigned freelancer can submit
    if (project.hiredFreelancer?._id.toString() !== req.user._id.toString()) {
      console.log("🚫 Unauthorized freelancer tried to submit project");
      return res.status(403).json({ success: false, message: "You are not authorized to submit this project." });
    }

    // ✅ Only allow submission from "in-progress"
    if (project.status !== "in-progress") {
      console.log("⚠️ Invalid status for submission:", project.status);
      return res.status(400).json({ success: false, message: "Project is not in progress or already submitted." });
    }

    // ✅ Change status
    project.status = "submitted";
    project.submittedAt = new Date();

    console.log("✅ Changing status to:", project.status);
    await project.save();
    console.log("💾 Saved new status successfully");

    // ✅ Notify client
    await transporter.sendMail({
      from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
      to: project.client.email,
      subject: "📦 Project Submitted for Your Approval",
      html: `
        <p>Dear ${project.client.fullName},</p>
        <p>The freelancer <b>${project.hiredFreelancer.fullName}</b> has submitted the project <b>${project.title}</b> for your review.</p>
        <p>Please log in to your dashboard to review the deliverables and approve or request changes.</p>
      `,
    });

    console.log("📨 Email notification sent to client:", project.client.email);

    return res.json({
      success: true,
      message: "✅ Project submitted successfully! Client has been notified.",
    });
  } catch (err) {
    console.error("❌ Submit For Approval Error:", err);
    return res.status(500).json({ success: false, message: "Error submitting project" });
  }
}
  /* ------------------ REQUEST MILESTONE RELEASE ------------------ */
  static async requestMilestoneRelease(req, res) {
    try {
      const project = await Project.findById(req.params.id).populate("client hiredFreelancer");
      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      // Notify admin and client
      const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";

      await Promise.all([
        transporter.sendMail({
          from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
          to: project.client.email,
          subject: "💸 Milestone Release Request",
          html: `
            <p>Dear ${project.client.fullName},</p>
            <p>The freelancer <b>${project.hiredFreelancer.fullName}</b> has requested a milestone payment release for project <b>${project.title}</b>.</p>
            <p>Please review and release payment if satisfied with the work.</p>
          `,
        }),
        transporter.sendMail({
          from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
          to: adminEmail,
          subject: "💰 Milestone Release Notification",
          html: `
            <p>The freelancer <b>${project.hiredFreelancer.fullName}</b> requested milestone release for project <b>${project.title}</b>.</p>
            <p>Client: ${project.client.fullName} (${project.client.email})</p>
          `,
        }),
      ]);

      res.json({
        success: true,
        message: "Milestone release request sent to client and admin.",
      });
    } catch (err) {
      winston.error("Request Milestone Release Error:", err.message);
      res.status(500).json({ success: false, message: "Error sending milestone request" });
    }
  }

  

  /* ------------------ ADMIN SECTION ------------------ */

    /**
   * 📋 1. Get all projects (with filter)
   * Admin can filter by status, search by title.
   */
static async getAllProjects(req, res, next) {
  try {
    const { status, search } = req.query;

    const match = {};
    if (status) match.status = status;
    if (search) match.title = { $regex: search, $options: "i" };

    const projects = await Project.aggregate([
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
        $project: {
          _id: 1,
          title: 1,
          budget: 1,

          // ✅ CLEAN + NORMALIZED STATUS
          status: {
            $toLower: {
              $trim: {
                input: { $ifNull: ["$status", "pending"] }
              }
            }
          },

          isActive: 1,
          createdAt: 1,
          clientName: "$client.fullName",
          clientEmail: "$client.email",
        },
      },

      { $sort: { createdAt: -1 } },
    ]);

    res.render("pages/admin/projects", {
      layout: "layouts/admin-layout",
      title: "Manage Projects",
      projects,
    });

  } catch (err) {
    winston.error("Project List Error: " + err.message);
    next(err);
  }
}





  /**
   * ✅ 2. Approve project
   * Marks project as approved and emails the client.
   */
  static async approveProject(req, res) {
    try {
      const project = await Project.findById(req.params.id).populate("client");
      if (!project)
        return res.status(404).json({ success: false, message: "Project not found" });

      project.status = "approved";
      project.approvedAt = new Date();
      project.approvedBy = req.user._id;
      await project.save();

      // Notify client
      try {
        await transporter.sendMail({
          from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
          to: project.client.email,
          subject: "✅ Project Approved",
          html: `
            <h2>Hi ${project.client.fullName},</h2>
            <p>Your project <b>${project.title}</b> has been approved and is now visible to freelancers.</p>
          `,
        });
      } catch (emailErr) {
        winston.warn("Approval Email Error: " + emailErr.message);
      }

      res.json({ success: true, message: "Project approved successfully" });
    } catch (err) {
      winston.error("Approve Project Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error approving project" });
    }
  }

  /**
   * ❌ 3. Reject (soft delete) project
   * Marks project as rejected and hides it from listings.
   */
  static async removeProject(req, res) {
    try {
      const project = await Project.findById(req.params.id).populate("client");
      if (!project)
        return res.status(404).json({ success: false, message: "Project not found" });

      // Soft delete
      project.status = "rejected";
      project.isActive = false;
      project.rejectedBy = req.user._id;
      project.rejectedAt = new Date();
      await project.save();

      // Notify client
      try {
        await transporter.sendMail({
          from: `"Freelancer Marketplace" <${process.env.EMAIL_USER}>`,
          to: project.client.email,
          subject: "⚠️ Project Rejected",
          html: `
            <h2>Hi ${project.client.fullName},</h2>
            <p>Your project <b>${project.title}</b> was rejected by the admin team.</p>
            <p>Please review our posting guidelines and resubmit if appropriate.</p>
          `,
        });
      } catch (emailErr) {
        winston.warn("Rejection Email Error: " + emailErr.message);
      }

      res.json({ success: true, message: `Project "${project.title}" rejected.` });
    } catch (err) {
      winston.error("Reject Project Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error rejecting project" });
    }
  }

  /**
   * 🚨 4. Monitor inactive or disputed projects
   * Detects projects inactive for 30+ days or with dispute status.
   */
  static async monitorProjects(req, res, next) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const inactiveProjects = await Project.find({
        updatedAt: { $lt: thirtyDaysAgo },
        status: { $in: ["pending", "in-progress"] },
      })
        .populate("client", "fullName email")
        .lean();

      const disputedProjects = await Project.find({ status: "disputed" })
        .populate("client", "fullName email")
        .lean();

      res.render("pages/admin/project-monitor", {
        layout: "layouts/admin-layout",
        title: "Project Monitoring",
        inactiveProjects,
        disputedProjects,
      });
    } catch (err) {
      winston.error("Monitor Projects Error: " + err.message);
      next(err);
    }
  }

  /**
   * 👁️ 5. Toggle visibility (hide/show project)
   */
  static async toggleVisibility(req, res) {
    try {
      const project = await Project.findById(req.params.id);
      if (!project)
        return res.status(404).json({ success: false, message: "Project not found." });

      project.isActive = !project.isActive;
      await project.save();

      res.json({
        success: true,
        message: `Project visibility ${project.isActive ? "enabled" : "hidden"}.`,
      });
    } catch (err) {
      winston.error("Toggle Visibility Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error toggling visibility." });
    }
  }

  /**
   * 🔢 6. (Optional) Reorder projects for display order
   */
  static async updateOrder(req, res) {
    try {
      const { projectId, order } = req.body;
      if (!projectId || typeof order !== "number")
        return res.status(400).json({ success: false, message: "Invalid data" });

      const project = await Project.findByIdAndUpdate(
        projectId,
        { order },
        { new: true }
      );

      if (!project)
        return res.status(404).json({ success: false, message: "Project not found" });

      res.json({ success: true, message: "Order updated", order: project.order });
    } catch (err) {
      winston.error("Update Project Order Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error updating order" });
    }
  }
}

module.exports = ProjectController;
