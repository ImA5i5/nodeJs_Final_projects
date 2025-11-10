// app/routes/milestone.routes.js
const express = require("express");
const router = express.Router();
const MilestoneController = require("../controllers/MilestoneController");
const Auth = require("../middleware/auth.middleware");
const Role = require("../middleware/role.middleware");
const Upload = require("../middleware/upload.middleware");

router.use(Auth.verifyAccessToken);

/* ----------------------------------------------------
   ✅ CLIENT ROUTES
-----------------------------------------------------*/

router.get(
  "/project/:id/milestones",
  Role.authorizeRoles("client"),
  MilestoneController.viewProjectMilestones
);
// Create milestone
router.post(
  "/:projectId/create",
  Role.authorizeRoles("client"),
  MilestoneController.create
);

// Fund
router.post(
  "/:id/fund",
  Role.authorizeRoles("client"),
  MilestoneController.fund
);

// Approve & Release
router.post(
  "/:id/release",
  Role.authorizeRoles("client"),
  MilestoneController.release
);

// Request revision
router.post(
  "/:id/request-revision",
  Role.authorizeRoles("client"),
  MilestoneController.requestRevision
);

// Open dispute
router.post(
  "/:id/dispute",
  Role.authorizeRoles("client"),
  MilestoneController.dispute
);




/* ----------------------------------------------------
   ✅ FREELANCER ROUTES
-----------------------------------------------------*/

// Start work
router.post(
  "/:id/start",
  Role.authorizeRoles("freelancer"),
  MilestoneController.start
);

// Submit
router.post(
  "/:id/submit",
  Role.authorizeRoles("freelancer"),
  Upload.multiple("files", 5),
  MilestoneController.submit
);

// Resume after revision
router.post(
  "/:id/resume",
  Role.authorizeRoles("freelancer"),
  MilestoneController.resume
);

module.exports = router;
