const express = require("express");
const router = express.Router();
const ReviewController = require("../controllers/ReviewController");
const Auth = require("../middleware/auth.middleware");
const Role = require("../middleware/role.middleware");

router.use(Auth.verifyAccessToken);

// ✅ Client opens review page
router.get(
  "/write/:projectId",
  Role.authorizeRoles("client"),
  ReviewController.reviewPage
);

// ✅ Submit Review (client)
router.post(
  "/submit",
  Role.authorizeRoles("client"),
  ReviewController.submit
);

// ✅ Freelancer Reply
router.post(
  "/reply",
  Role.authorizeRoles("freelancer"),
  ReviewController.reply
);

// ✅ Admin Moderation
router.post(
  "/moderate",
  Role.authorizeRoles("admin"),
  ReviewController.moderate
);

router.get(
  "/list",
  Role.authorizeRoles("client"),
  ReviewController.clientReviewList
);

// ✅ View review
router.get("/view/:projectId", ReviewController.view);

module.exports = router;
