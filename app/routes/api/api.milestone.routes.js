// app/routes/api/api.milestone.routes.js

const express = require("express");
const router = express.Router();

const ApiMilestoneController = require("../../controllers/api/ApiMilestoneController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");
const Upload = require("../../middleware/upload.middleware");

router.use(ApiAuth.verifyAccessToken);



// ✅ CLIENT ROUTES
// ✅ GET single milestone
router.get("/:id",ApiRole.allow("client")
, ApiMilestoneController.getMilestoneById);
router.post("/:projectId", ApiRole.allow("client"), ApiMilestoneController.createMilestone);
router.patch("/:id/fund", ApiRole.allow("client"), ApiMilestoneController.fundMilestone);
router.patch("/:id/release", ApiRole.allow("client"), ApiMilestoneController.releasePayment);
router.patch("/:id/revision", ApiRole.allow("client"), ApiMilestoneController.requestRevision);

// ✅ FREELANCER ROUTES
router.patch("/:id/accept", ApiRole.allow("freelancer"), ApiMilestoneController.acceptMilestone);
router.patch("/:id/start", ApiRole.allow("freelancer"), ApiMilestoneController.startWork);
router.patch("/:id/submit", ApiRole.allow("freelancer"), Upload.multiple("deliverables", 5), ApiMilestoneController.submitWork);

module.exports = router;
