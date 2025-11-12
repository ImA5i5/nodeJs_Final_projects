// app/controllers/api/ApiProjectController.js

const Project = require("../../models/Project");
const Category = require("../../models/Category");
const FileService = require("../../services/file.service");
const EmailService = require("../../services/email.service");
const winston = require("../../config/winston");

class ApiProjectController {

  /**
   * ✅ Client: Create New Project
   * POST /api/project
   */
  static async createProject(req, res) {
    try {
      const clientId = req.user._id;
      const {
        title,
        description,
        category,
        subcategory,
        budget,
        duration,
        paymentType
      } = req.body;

      if (!title || !description || !category || !budget) {
        return res.status(400).json({ message: "Required fields missing" });
      }

      // ✅ Upload attachments to Cloudinary
      let attachments = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const url = await FileService.uploadFile(file.path, "projects");
          attachments.push(url);
        }
      }

      const project = await Project.create({
        client: clientId,
        title,
        description,
        category,
        subcategory,
        budget,
        duration,
        paymentType,
        attachments,
        status: "pending", // admin must approve
      });

      return res.status(201).json({
        message: "Project posted successfully and waiting for admin approval.",
        project,
      });
    } catch (err) {
      winston.error("Create Project Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ Client: Edit Own Project (Only if pending)
   * PUT /api/project/:projectId
   */
  static async editProject(req, res) {
    try {
      const { projectId } = req.params;
      const clientId = req.user._id;

      const project = await Project.findOne({ _id: projectId, client: clientId });

      if (!project)
        return res.status(404).json({ message: "Project not found" });

      if (project.status !== "pending") {
        return res.status(400).json({
          message: "You can only edit a project that is still pending approval",
        });
      }

      Object.assign(project, req.body);
      await project.save();

      return res.json({ message: "Project updated", project });
    } catch (err) {
      winston.error("Edit Project Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ Client: Get My Projects
   * GET /api/project/my-projects
   */
  static async getMyProjects(req, res) {
    try {
      const clientId = req.user._id;

      const projects = await Project.find({ client: clientId }).populate("category");

      return res.json({ projects });
    } catch (err) {
      winston.error("Get My Projects Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
 * ✅ CLIENT: Approve project after reviewing deliverables
 * PATCH /api/project/client/approve/:projectId
 * Condition: Project must be submitted by freelancer
 * Result: submitted → completed
 */
static async approveCompletedProject(req, res) {
  try {
    const { projectId } = req.params;
    const clientId = req.user._id;

    // 🔍 Fetch project and freelancer info
    const project = await Project.findById(projectId).populate("hiredFreelancer", "email fullName");
    if (!project) return res.status(404).json({ message: "Project not found" });

    // 🧾 Ensure the approver is the project client
    if (project.client.toString() !== clientId.toString()) {
      return res.status(403).json({ message: "Unauthorized — This is not your project" });
    }

    // 🕒 Ensure the project is ready for approval
    if (project.status !== "submitted") {
      return res.status(400).json({ message: "Project must be submitted before approval" });
    }

    // ✅ Mark project as completed
    project.status = "completed";
    project.progress = 100;
    project.reviewed = true;
    await project.save();

    // 📧 Notify freelancer
    await EmailService.sendNotification(
      project.hiredFreelancer.email,
      "🎉 Project Completed",
      `
      <p>Dear ${project.hiredFreelancer.fullName || "Freelancer"},</p>
      <p>Congratulations! Your project <b>${project.title}</b> has been approved and marked as completed by the client.</p>
      <p>Great work!</p>
      `
    );

    // 📧 (Optional) Notify admin or log
    winston.info(`✅ Project ${project._id} marked completed by client ${clientId}`);

    return res.json({
      message: "Project approved successfully — marked as completed",
      project: {
        id: project._id,
        title: project.title,
        status: project.status,
        progress: project.progress,
      },
    });
  } catch (err) {
    winston.error("Approve Completed Project Error: " + err.message);
    return res.status(500).json({ message: "Server error" });
  }
}



  /**
   * ✅ Freelancer: Browse Approved Projects
   * GET /api/project/browse
   */
  static async browseProjects(req, res) {
    try {
      const projects = await Project.find({ status: "approved", isActive: true })
        .populate("category", "name")
        .sort({ createdAt: -1 });

      return res.json({ projects });
    } catch (err) {
      winston.error("Browse Projects Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ FREELANCER: Accept Assigned Project
   * PATCH /api/project/freelancer/accept/:projectId
   * Condition: Project must be assigned to this freelancer
   * Result: assigned → in-progress
   */
  static async freelancerAcceptProject(req, res) {
    try {
      const { projectId } = req.params;
      const freelancerId = req.user._id;

      const project = await Project.findById(projectId).populate("client", "email fullName");
      if (!project)
        return res.status(404).json({ message: "Project not found" });

      if (!project.hiredFreelancer || project.hiredFreelancer.toString() !== freelancerId.toString()) {
        return res.status(403).json({ message: "You are not assigned to this project" });
      }

      if (project.status !== "assigned") {
        return res.status(400).json({ message: "Project is not assigned yet" });
      }

      project.status = "in-progress";
      await project.save();

      // ✅ Notify client that freelancer accepted
      await EmailService.sendNotification(
        project.client.email,
        "Freelancer Accepted Project",
        `<p>Your hired freelancer has accepted the project: <b>${project.title}</b>.</p>`
      );

      return res.json({
        message: "Project accepted successfully — now in progress",
        project: {
          id: project._id,
          title: project.title,
          status: project.status,
        },
      });
    } catch (err) {
      winston.error("Freelancer Accept Project Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
 * ✅ FREELANCER: Submit final project deliverables
 * PATCH /api/project/freelancer/submit/:projectId
 * Condition: Project must be in-progress and assigned to this freelancer
 * Result: in-progress → submitted
 */
static async submitFinalDeliverables(req, res) {
  try {
    const { projectId } = req.params;
    const freelancerId = req.user._id;

    // 🔍 Find project with related client
    const project = await Project.findById(projectId).populate("client", "email fullName");
    if (!project) return res.status(404).json({ message: "Project not found" });

    // 🧾 Verify freelancer authorization
    if (!project.hiredFreelancer || project.hiredFreelancer.toString() !== freelancerId.toString()) {
      return res.status(403).json({ message: "Unauthorized — You are not assigned to this project" });
    }

    // 🕒 Ensure project is in correct state
    if (project.status !== "in-progress") {
      return res.status(400).json({ message: "Project must be in-progress before submission" });
    }

    // 📁 Upload final deliverables to Cloudinary
    const deliverables = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const uploadedUrl = await FileService.uploadFile(file.path, "project_deliverables");
        deliverables.push(uploadedUrl);
      }
    }

    // 🧩 Update project fields
    project.status = "submitted";
    project.progress = 90; // near completion
    project.attachments = [...(project.attachments || []), ...deliverables];
    await project.save();

    // 📧 Notify client that freelancer submitted work
    await EmailService.sendNotification(
      project.client.email,
      "📦 Project Submitted for Review",
      `
      <p>Dear ${project.client.fullName || "Client"},</p>
      <p>Your freelancer has submitted final deliverables for the project:</p>
      <h3>${project.title}</h3>
      <p>Please review and approve the completion if satisfied.</p>
      `
    );

    return res.json({
      message: "Project deliverables submitted successfully — awaiting client approval",
      project: {
        id: project._id,
        title: project.title,
        status: project.status,
        progress: project.progress,
        attachments: project.attachments,
      },
    });
  } catch (err) {
    winston.error("Submit Final Deliverables Error: " + err.message);
    return res.status(500).json({ message: "Server error" });
  }
}



  // --------------------------------------------------------------------------
  // ✅ ADMIN PANEL LOGIC
  // --------------------------------------------------------------------------

  /**
   * ✅ ADMIN: Get All Projects
   */
  static async adminGetAll(req, res) {
    try {
      const projects = await Project.find().populate("client", "fullName email");
      return res.json({ projects });
    } catch (err) {
      winston.error("Admin Get All Projects Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ ADMIN: Approve Project
   * PUT /api/project/admin/approve/:projectId
   */
  static async approveProject(req, res) {
    try {
      const { projectId } = req.params;
      const adminId = req.user._id;

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      project.status = "approved";
      project.approvedBy = adminId;
      project.approvedAt = new Date();

      await project.save();

      return res.json({ message: "Project approved", project });
    } catch (err) {
      winston.error("Approve Project Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }


  /**
   * ✅ ADMIN: Reject Project
   * PUT /api/project/admin/reject/:projectId
   */
  static async rejectProject(req, res) {
    try {
      const { projectId } = req.params;
      const adminId = req.user._id;

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      project.status = "rejected";
      project.rejectedBy = adminId;
      project.rejectedAt = new Date();

      await project.save();

      return res.json({ message: "Project rejected", project });
    } catch (err) {
      winston.error("Reject Project Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = ApiProjectController;
