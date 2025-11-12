// app/routes/api/api.bid.routes.js

const express = require("express");
const router = express.Router();

const ApiBidController = require("../../controllers/api/ApiBidController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");

// ✅ All bid routes require authentication
router.use(ApiAuth.verifyAccessToken);

// ✅ FREELANCER ROUTES
router.post("/:projectId", ApiRole.allow("freelancer"), ApiBidController.submitBid);
router.delete("/:bidId", ApiRole.allow("freelancer"), ApiBidController.withdrawBid);

// ✅ CLIENT ROUTES
router.get("/project/:projectId", ApiRole.allow("client"), ApiBidController.getBidsForProject);
router.patch("/:bidId/shortlist", ApiRole.allow("client"), ApiBidController.shortlistBid);
router.patch("/:bidId/reject", ApiRole.allow("client"), ApiBidController.rejectBid);
router.patch("/:bidId/accept", ApiRole.allow("client"), ApiBidController.acceptBid);
// ✅ Client hires freelancer
router.patch("/:bidId/hire", ApiRole.allow("client"), ApiBidController.hireFreelancer);

module.exports = router;
