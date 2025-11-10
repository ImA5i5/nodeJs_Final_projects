// /app/routes/adminReview.routes.js
const router = require("express").Router();
const Review = require("../models/Review");
const ReviewController = require("../controllers/ReviewController");
const Auth = require("../middleware/auth.middleware");
const Role = require("../middleware/role.middleware");

// ✅ Admin middleware
router.use(Auth.verifyAccessToken, Role.authorizeRoles("admin"));

// ✅ List all reviews
router.get("/", async (req, res) => {
  const reviews = await Review.find()
    .populate("project client freelancer")
    .sort({ createdAt: -1 })
    .lean();

  res.render("pages/admin/reviews-list", {
    layout: "layouts/admin-layout",
    reviews,
  });
});

// ✅ Review details
router.get("/:reviewId", async (req, res) => {
  const review = await Review.findById(req.params.reviewId)
    .populate("project client freelancer")
    .lean();

  res.render("pages/admin/review-details", {
    layout: "layouts/admin-layout",
    review,
  });
});

// ✅ Moderate (Remove/Restore)
router.post("/moderate", ReviewController.moderate);

module.exports = router;
