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
const ChatController = require("../controllers/ChatController");
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


// ✅ Freelancer Chat List Page
router.get("/chat-list", ChatController.chatList);

// ✅ Chat Room (open chat with specific user)
router.get("/chat-room/:id", ChatController.chatRoom);



// Chat room with specific user
router.get("/chat/:id", ChatController.chatRoom);

// Send message
router.post("/chat/send", UploadMiddleware.single("file"), ChatController.sendMessage);

// Fetch messages via AJAX
router.get("/chat/messages/:receiverId", ChatController.getMessages);

// ✅ Add this route — connect Earnings page
// ✅ Freelancer Earnings Page (FIXED)
router.get("/earnings", WalletController.getEarnings);


// ⭐ Reviews
router.get("/reviews", ReviewController.getFreelancerReviews);
router.post("/reviews/respond", ReviewController.respondToReview);
router.get("/reviews/ajax", ReviewController.getReviewsAjax);




module.exports = router;
