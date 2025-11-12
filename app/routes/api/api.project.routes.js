// app/routes/api/api.project.routes.js
const express = require("express");
const router = express.Router();

const ApiProjectController = require("../../controllers/api/ApiProjectController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");
const Upload = require("../../middleware/upload.middleware");

// ✅ All project routes require authentication
router.use(ApiAuth.verifyAccessToken);

// ✅ CLIENT ROUTES
router.post(
  "/",
  ApiRole.allow("client"),
  Upload.multiple("attachments", 5),
  ApiProjectController.createProject
);

router.put(
  "/:projectId",
  ApiRole.allow("client"),
  ApiProjectController.editProject
);

router.get(
  "/my-projects",
  ApiRole.allow("client"),
  ApiProjectController.getMyProjects
);

// Client approval after submission
router.patch("/client/approve/:projectId", ApiRole.allow("client"), ApiProjectController.approveCompletedProject);


// ✅ FREELANCER ROUTES
router.get(
  "/browse",
  ApiRole.allow("freelancer"),
  ApiProjectController.browseProjects
);

router.patch("/freelancer/accept/:projectId", ApiRole.allow("freelancer"), ApiProjectController.freelancerAcceptProject);

router.patch("/freelancer/submit/:projectId", ApiRole.allow("freelancer"), Upload.multiple("deliverables", 5), ApiProjectController.submitFinalDeliverables);


// ✅ ADMIN ROUTES
router.get(
  "/admin/all",
  ApiRole.allow("admin"),
  ApiProjectController.adminGetAll
);

router.put(
  "/admin/approve/:projectId",
  ApiRole.allow("admin"),
  ApiProjectController.approveProject
);

router.put(
  "/admin/reject/:projectId",
  ApiRole.allow("admin"),
  ApiProjectController.rejectProject
);

module.exports = router;
