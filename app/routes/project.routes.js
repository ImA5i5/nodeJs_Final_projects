// app/routes/project.routes.js
const express = require("express");
const router = express.Router();

const ProjectController = require("../controllers/ProjectController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");
const UploadMiddleware = require("../middleware/upload.middleware");

router.use(AuthMiddleware.verifyAccessToken);

/* ------------------------------------------------------------------
   📦 CLIENT SIDE ROUTES
------------------------------------------------------------------- */

// 👀 View Deliverables
router.get(
  "/client/:id/deliverables",
  RoleMiddleware.authorizeRoles("client"),
  ProjectController.viewDeliverables
);

// ✅ Approve Project
router.put(
  "/client/:id/approve",
  AuthMiddleware.verifyAccessToken,           // 🔐 must be logged in
  RoleMiddleware.authorizeRoles("client"),    // 👤 only client can approve
  ProjectController.approveProject            // ✅ updated final function
);

// 🔁 Request Changes
router.put(
  "/client/:id/revision",
  RoleMiddleware.authorizeRoles("client"),
  ProjectController.requestRevision
);
/*================📈 Project Management Module============*/

// 📈 View + Manage project details
router.get("/:id/manage",RoleMiddleware.authorizeRoles("client"), ProjectController.clientViewProject);

// ✅ Approve milestone
router.post("/milestone/:id/approve",RoleMiddleware.authorizeRoles("client"), ProjectController.approveMilestone);

// 🔁 Request revision
router.post("/milestone/:id/revision",RoleMiddleware.authorizeRoles("client"), ProjectController.requestRevision);

// 💬 Send chat message
router.post("/:id/message",RoleMiddleware.authorizeRoles("client"), ProjectController.sendProjectMessage);

// 🏁 Close completed project
router.post("/:id/close",RoleMiddleware.authorizeRoles("client"), ProjectController.closeProject);

/*=============📝 Project Posting Module================*/

/* ------------------------------------------------------------------
   📁 View All Projects (Client)
------------------------------------------------------------------- */
router.get("/projects",RoleMiddleware.authorizeRoles("client"), ProjectController.viewMyProjects);

/* ------------------------------------------------------------------
   🆕 Create Project (Form + Save)
------------------------------------------------------------------- */
// Render create project form with categories
router.get(
  "/create",
  RoleMiddleware.authorizeRoles("client"),
  ProjectController.renderCreateProject
);

// Handle project creation (AJAX or normal form)
router.post(
  "/create",
  RoleMiddleware.authorizeRoles("client"),
  UploadMiddleware.multiple("attachments", 5),
  ProjectController.createProject
);

/* ------------------------------------------------------------------
   ✏️ Edit / Update Project
------------------------------------------------------------------- */
// Render edit form
router.get(
  "/:id/edit",
  RoleMiddleware.authorizeRoles("client"),
  ProjectController.renderEditProject
);

// Update project
router.put(
  "/:id",
  RoleMiddleware.authorizeRoles("client"),
  UploadMiddleware.multiple("attachments", 5),
  ProjectController.updateProject
);

/* ------------------------------------------------------------------
   ❌ Delete Project
------------------------------------------------------------------- */
router.delete(
  "/:id",
  RoleMiddleware.authorizeRoles("client"),
  ProjectController.deleteProject
);

// ----------------- FREELANCER ROUTES -----------------
router.post(
  "/:id/submit",
  RoleMiddleware.authorizeRoles("freelancer"),
  ProjectController.submitForApproval
);
//===========💼 Project Browsing & Bidding Module========

router.get("/my-bids",RoleMiddleware.authorizeRoles("freelancer"), ProjectController.myBids);
router.get(
  "/browse",
  RoleMiddleware.authorizeRoles("freelancer"),
  ProjectController.browse
);

router.post(
  "/bid",
  RoleMiddleware.authorizeRoles("freelancer"),
  ProjectController.placeBid
);

router.get(
  "/my-bids",
  RoleMiddleware.authorizeRoles("freelancer"),
  ProjectController.myBids
);

router.put("/bid/:id/edit",RoleMiddleware.authorizeRoles("freelancer"), ProjectController.editBid);

router.delete("/bid/:id/withdraw",RoleMiddleware.authorizeRoles("freelancer"), ProjectController.withdrawBid);

//=======🧾 Project Work & Delivery Module============
// 📂 View all projects assigned to freelancer
router.get("/my-projects",RoleMiddleware.authorizeRoles("freelancer"), ProjectController.myProjects);

// ✅ Accept assigned project
router.post("/:id/accept",RoleMiddleware.authorizeRoles("freelancer"), ProjectController.acceptProject);

// view milestone
router.get("/milestones",RoleMiddleware.authorizeRoles("freelancer"), ProjectController.viewAllMilestones);

// ➕ Add milestone
router.post("/:projectId/milestone",RoleMiddleware.authorizeRoles("freelancer"), ProjectController.addMilestone);

// 🟢 Mark milestone as completed
router.put("/milestone/:id/complete",RoleMiddleware.authorizeRoles("freelancer"), ProjectController.completeMilestone);

// 📁 Upload deliverables (freelancer only)
router.post(
  "/:id/upload",
  RoleMiddleware.authorizeRoles("freelancer"),
  UploadMiddleware.multiple("deliverables", 5),
  ProjectController.uploadDeliverables
);

// ✅ Correct route
router.post("/:id/submit",
  RoleMiddleware.authorizeRoles("freelancer"),
  ProjectController.submitForApproval
);
/* ------------------------------------------------------------------
   🧭 ADMIN PROJECT MANAGEMENT ROUTES
   Handles project moderation, visibility, and monitoring
------------------------------------------------------------------- */

// 📋 Get all projects (Admin dashboard)
router.get(
  "/admin/projects",
  RoleMiddleware.authorizeRoles("admin"),
  ProjectController.getAllProjects
);

// ✅ Approve project
router.put(
  "/admin/projects/:id/approve",
  RoleMiddleware.authorizeRoles("admin"),
  ProjectController.approveProject
);

// ❌ Reject (soft delete) project
router.delete(
  "/admin/projects/:id/remove",
  RoleMiddleware.authorizeRoles("admin"),
  ProjectController.removeProject
);

// 👁️ Toggle visibility
router.patch(
  "/admin/projects/:id/visibility",
  RoleMiddleware.authorizeRoles("admin"),
  ProjectController.toggleVisibility
);

// 🚨 Monitor inactive or disputed projects
router.get(
  "/admin/monitor",
  RoleMiddleware.authorizeRoles("admin"),
  ProjectController.monitorProjects
);

// 🔢 Optional: Update display order (AJAX)
router.post(
  "/admin/projects/order",
  RoleMiddleware.authorizeRoles("admin"),
  ProjectController.updateOrder
);

module.exports = router;


