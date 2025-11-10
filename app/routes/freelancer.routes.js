// app/routes/freelancer.routes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const Message = require("../models/Message"); // ✅ add this
const User = require("../models/User"); 
const ProjectController=require("../controllers/ProjectController");
const FreelancerController = require("../controllers/FreelancerController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");
const UploadMiddleware = require("../middleware/upload.middleware");

const PaymentController = require("../controllers/PaymentController");
const ReviewController = require("../controllers/ReviewController");
const WalletController = require("../controllers/WalletController");

const upload = multer({ dest: "uploads/" }); // local temporary upload

// Middleware
router.use(AuthMiddleware.verifyAccessToken);
router.use(RoleMiddleware.authorizeRoles("freelancer"));

// Dashboard
router.get("/dashboard", FreelancerController.dashboard);

// Profile routes
router.get("/profile", FreelancerController.getProfile);
router.post(
  "/profile/update",
  UploadMiddleware.profileUpload(),
  FreelancerController.updateProfile
);

// Reviews
router.get("/reviews", FreelancerController.getReviews);

// Browse Projects
router.get("/browse", ProjectController.browse);
router.post("/bid", ProjectController.placeBid);

// 🧾 My Bids
router.get("/my-bids", ProjectController.myBids);

// Freelancer: View all assigned projects
router.get("/my-projects", ProjectController.myProjects);

// Freelancer: Manage milestones for all projects
router.get("/milestones", ProjectController.viewAllMilestones); 
// 🔹 This is a new controller function you’ll create to show all milestones per freelancer


// ✅ Add this route — connect Earnings page
// ✅ Freelancer Earnings Page (FIXED)
router.get("/earnings", WalletController.getEarnings);


// ⭐ Reviews
// app/routes/freelancer.routes.js
router.get("/freelancer/reviews",
  AuthMiddleware.verifyAccessToken,
  RoleMiddleware.authorizeRoles("freelancer"),
  async (req, res) => {
    const Review = require("../models/Review");
    const reviews = await Review.find({ freelancer: req.user._id, removed: false })
      .populate("project", "title")
      .populate("client", "fullName")
      .sort({ createdAt: -1 })
      .lean();

    res.render("pages/freelancer/reviews", {
      layout: "layouts/freelancer-layout",
      reviews
    });
  }
);

router.get("/freelancer/review/:reviewId",
  AuthMiddleware.verifyAccessToken,
  RoleMiddleware.authorizeRoles("freelancer"),
  async (req, res) => {
    const Review = require("../models/Review");
    const review = await Review.findOne({ _id: req.params.reviewId, freelancer: req.user._id })
      .populate("project", "title")
      .populate("client", "fullName")
      .lean();

    if (!review) return res.status(404).send("Review not found");

    res.render("pages/freelancer/review-details", {
      layout: "layouts/freelancer-layout",
      review
    });
  }
);





module.exports = router;
