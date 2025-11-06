// app/routes/milestone.routes.js
const express = require("express");
const router = express.Router();
const MilestoneController = require("../controllers/MilestoneController");
const Auth = require("../middleware/auth.middleware");
const Role = require("../middleware/role.middleware");
const UploadMiddleware = require("../middleware/upload.middleware");

// Protect
router.use(Auth.verifyAccessToken);

// Client creates milestone for their project
router.post("/project/:projectId/milestone", Role.authorizeRoles("client"), MilestoneController.create);

// Client deposit escrow for a milestone
router.post("/milestone/:id/deposit", Role.authorizeRoles("client"), MilestoneController.depositEscrow);

// Freelancer starts milestone (mark in-progress)
router.post("/milestone/:id/start", Role.authorizeRoles("freelancer"), MilestoneController.start);

// Freelancer uploads deliverables (files)
router.post("/milestone/:id/upload", Role.authorizeRoles("freelancer"), UploadMiddleware.multiple("attachments", 5), MilestoneController.uploadDeliverables);

// Client reviews: approve / request revision
router.post("/milestone/:id/review", Role.authorizeRoles("client"), MilestoneController.clientReviewAction);

// List milestones for a project (client/freelancer can view)
router.get("/project/:projectId/milestones", Auth.verifyAccessToken, MilestoneController.listForProject);

// 📤 Submit milestone for client review
router.post(
  "/freelancer/:id/submit",
  Role.authorizeRoles("freelancer"),
  MilestoneController.submitMilestone
);

// ✅ Approve milestone (release payment)
router.put(
  "/client/:id/approve",
  Role.authorizeRoles("client"),
  MilestoneController.approveMilestone
);

// 🔁 Request revision (send back to freelancer)
router.put(
  "/client/:id/request-changes",
  Role.authorizeRoles("client"),
  MilestoneController.requestChanges
);

module.exports = router;
