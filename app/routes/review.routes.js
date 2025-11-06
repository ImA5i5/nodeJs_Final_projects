// app/routes/review.routes.js
const express = require("express");
const router = express.Router();

const ReviewController = require("../controllers/ReviewController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");

// ✅ Protect all review routes
router.use(AuthMiddleware.verifyAccessToken);

/* --------------------------------------------------------------------------
   🌟 FREELANCER REVIEW ROUTES
-------------------------------------------------------------------------- */

// 🧾 View all reviews received
router.get(
  "/freelancer",
  RoleMiddleware.authorizeRoles("freelancer"),
  ReviewController.getFreelancerReviews
);

// 💬 Respond to a review (AJAX)
router.post(
  "/freelancer/respond",
  RoleMiddleware.authorizeRoles("freelancer"),
  ReviewController.respondToReview
);

// 🔄 Refresh freelancer reviews via AJAX
router.get(
  "/freelancer/ajax",
  RoleMiddleware.authorizeRoles("freelancer"),
  ReviewController.getReviewsAjax
);

/* --------------------------------------------------------------------------
   💬 CLIENT REVIEW ROUTES
-------------------------------------------------------------------------- */

// 📝 Render review form (after project completion)
router.get(
  "/client/review/:projectId",
  RoleMiddleware.authorizeRoles("client"),
  ReviewController.reviewForm
);

// ✅ Submit a new review
router.post(
  "/client/submit",
  RoleMiddleware.authorizeRoles("client"),
  ReviewController.submitReview
);

// 👀 View all reviews written by the client
router.get(
  "/client",
  RoleMiddleware.authorizeRoles("client"),
  ReviewController.getClientReviews
);

// 🔄 AJAX endpoint to refresh client reviews
router.get(
  "/client/ajax",
  RoleMiddleware.authorizeRoles("client"),
  ReviewController.getClientReviewsAjax
);

module.exports = router;
