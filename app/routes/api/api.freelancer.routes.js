// app/routes/api/api.freelancer.routes.js

const express = require("express");
const router = express.Router();

const ApiFreelancerController = require("../../controllers/api/ApiFreelancerController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");
const Upload = require("../../middleware/upload.middleware");

router.use(ApiAuth.verifyAccessToken);
router.use(ApiRole.allow("freelancer"));

// ✅ Dashboard
router.get("/dashboard", ApiFreelancerController.dashboard);

// ✅ Create profile
router.post(
  "/profile/create",
  Upload.profileUpload(),
  ApiFreelancerController.createProfile
);

// ✅ Update profile
router.put("/profile", ApiFreelancerController.updateProfile);

// ✅ Upload profile picture + portfolio
router.post(
  "/profile/media",
  Upload.profileUpload(),
  ApiFreelancerController.uploadMedia
);

// ✅ Add skill
router.post("/skills", ApiFreelancerController.addSkill);

// ✅ Add certification
router.post("/certifications", ApiFreelancerController.addCertification);

// ✅ Get reviews
router.get("/reviews", ApiFreelancerController.getReviews);

module.exports = router;
