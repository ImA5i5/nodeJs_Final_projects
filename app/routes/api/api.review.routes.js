// app/routes/api/api.review.routes.js
const express = require("express");
const router = express.Router();

const ApiReviewController = require("../../controllers/api/ApiReviewController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");

router.use(ApiAuth.verifyAccessToken);

// ✅ Client: Submit review after project completion
router.post("/:projectId", ApiRole.allow("client"), ApiReviewController.createReview);

// ✅ Freelancer: Reply to a review
router.patch("/:reviewId/reply", ApiRole.allow("freelancer"), ApiReviewController.replyToReview);

// ✅ Admin: Moderate or restore a review
router.patch("/:reviewId/moderate", ApiRole.allow("admin"), ApiReviewController.moderateReview);

// ✅ View reviews for freelancer profile
router.get("/freelancer/:freelancerId",ApiRole.allow("client", "freelancer", "admin"), ApiReviewController.getFreelancerReviews);

// ✅ Client: View own reviews
router.get("/my", ApiRole.allow("client"), ApiReviewController.getMyReviews);

module.exports = router;
