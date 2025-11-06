// app/routes/client.routes.js
/**
 * ------------------------------------------------------------------
 * 🧩 CLIENT ROUTES
 * Handles:
 *  - Dashboard
 *  - Project Management (CRUD)
 *  - Freelancer Hiring
 *  - Proposals
 *  - Chat & Notifications
 *  - Payments
 *  - Reviews
 * ------------------------------------------------------------------
 */

const express = require("express");
const router = express.Router();

const Message = require("../models/Message");
const User = require("../models/User");
const Project = require("../models/Project");

const ClientController = require("../controllers/ClientController");
const ProjectController = require("../controllers/ProjectController");
const ClientHireController = require("../controllers/ClientHireController");
const ChatController = require("../controllers/ChatController");
const PaymentController = require("../controllers/PaymentController");
const ReviewController = require("../controllers/ReviewController");

const Milestone = require("../models/Milestone");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");
const UploadMiddleware = require("../middleware/upload.middleware");

// 🔐 Protect all client routes
router.use(AuthMiddleware.verifyAccessToken);
router.use(RoleMiddleware.authorizeRoles("client"));

/* ------------------------------------------------------------------
   📊 DASHBOARD
------------------------------------------------------------------- */
router.get("/dashboard", ClientController.dashboard);

/* ------------------------------------------------------------------
   📝 POST PROJECT (Form + Create)
------------------------------------------------------------------- */
// Renders the project form (fetches categories automatically)
router.get("/post-project", ProjectController.renderCreateProject);

// AJAX or normal submission
router.post(
  "/post-project",
  UploadMiddleware.multiple("attachments", 5),
  ProjectController.createProject
);

// (Fallback AJAX endpoint for /client/create)
router.post(
  "/create",
  UploadMiddleware.multiple("attachments", 5),
  ProjectController.createProject
);

/* ------------------------------------------------------------------
   📁 MY PROJECTS (List + Edit + Delete)
------------------------------------------------------------------- */
router.get("/projects", ProjectController.viewMyProjects);
router.get("/projects/:id/edit", ProjectController.renderEditProject);

router.put(
  "/projects/:id",
  UploadMiddleware.multiple("attachments", 5),
  ProjectController.updateProject
);

router.delete("/projects/:id", ProjectController.deleteProject);

/* ------------------------------------------------------------------
   📈 MANAGE PROJECT (Single + List)
------------------------------------------------------------------- */
router.get("/manage", async (req, res, next) => {
  try {
    const project = await Project.findOne({ client: req.user._id })
      .populate("hiredFreelancer client category")
      .lean();

    const Milestone = require("../models/Milestone");
    const milestones = project ? await Milestone.find({ project: project._id }).lean() : [];

    const progress =
      milestones.length > 0
        ? Math.round(
            (milestones.filter((m) => m.status === "completed").length / milestones.length) * 100
          )
        : 0;

    res.render("pages/client/manage-project", {
      layout: "layouts/client-layout",
      title: "Manage Project",
      project,
      milestones,
      progress,
    });
  } catch (err) {
    next(err);
  }
});

// Manage list view
router.get("/manage/list", async (req, res, next) => {
  try {
    const projects = await Project.find({ client: req.user._id })
      .populate("hiredFreelancer")
      .lean();

    res.render("pages/client/manage-projects-list", {
      layout: "layouts/client-layout",
      title: "Manage All Projects",
      projects,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/manage/:id", ProjectController.clientViewProject);

/* ------------------------------------------------------------------
   🧩 FREELANCER HIRING & PROPOSALS
------------------------------------------------------------------- */
router.get("/hire", ClientHireController.browseFreelancers);
router.get("/hire/:id", ClientHireController.viewFreelancerProfile);

// View proposals
router.get("/proposals", ClientHireController.viewProposals);
router.get("/proposals/:projectId", ClientHireController.viewProposals);

// Hire freelancer (AJAX)
router.post("/hire/:freelancerId/:projectId", ClientHireController.hireFreelancer);

/* ------------------------------------------------------------------
   milestone
------------------------------------------------------------------- */
// app/routes/client.routes.js
router.get("/milestones", async (req, res, next) => {
  const projects = await Project.find({ client: req.user._id }).select("_id title");
  const milestones = await Milestone.find({
    project: { $in: projects.map(p => p._id) },
  }).populate("project", "title");

  res.render("pages/client/milestones", {
    layout: "layouts/client-layout",
    title: "My Milestones",
    project: projects[0] || null,
    milestones,
  });
});


router.get(
  "/projects/:id/milestones",
  RoleMiddleware.authorizeRoles("client"),
  async (req, res, next) => {
    const Project = require("../models/Project");
    const Milestone = require("../models/Milestone");
    try {
      // Find all projects by this client
      const projects = await Project.find({ client: req.user._id }, "_id title").lean();

      // Extract all project IDs
      const projectIds = projects.map(p => p._id);

      // Fetch milestones for those projects
      const milestones = await Milestone.find({ project: { $in: projectIds } })
        .populate("project", "title")
        .lean();

      res.render("pages/client/milestones-all", {
        layout: "layouts/client-layout",
        projects,
        milestones,
      });
    } catch (err) {
      next(err);
    }
  }
);


/* ------------------------------------------------------------------
   💬 CHAT & NOTIFICATIONS
------------------------------------------------------------------- */
// Inbox
router.get("/chat-list", async (req, res, next) => {
  try {
    const userId = req.user._id;

    const chats = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"],
          },
          lastMessage: { $first: "$content" },
          createdAt: { $first: "$createdAt" },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    const populatedChats = await Promise.all(
      chats.map(async (c) => {
        const otherUser = await User.findById(c._id).select("fullName profile.profilePic role").lean();
        return { otherUser, lastMessage: c.lastMessage, createdAt: c.createdAt };
      })
    );

    res.render("pages/client/chat-list", {
      layout: "layouts/client-layout",
      title: "Chat Inbox",
      chats: populatedChats,
    });
  } catch (err) {
    next(err);
  }
});

// Chat redirect
router.get("/chat", (req, res) => res.redirect("/client/chat-list"));

// Chat room
router.get("/chat/:id", ChatController.chatRoom);
router.post("/chat/send", UploadMiddleware.single("file"), ChatController.sendMessage);
router.get("/chat/messages/:receiverId", ChatController.getMessages);

// Notifications polling
router.get("/notifications", ChatController.getAlerts);

/* ------------------------------------------------------------------
   💸 PAYMENTS (Client)
------------------------------------------------------------------- */
router.get("/payments", PaymentController.clientPayments);
router.post("/payments/deposit", PaymentController.depositEscrow);

/* ------------------------------------------------------------------
   ⭐ REVIEWS (Client)
------------------------------------------------------------------- */
router.get("/reviews", ReviewController.getClientReviews);
router.get("/review/:projectId", ReviewController.reviewForm);
router.post("/review", ReviewController.submitReview);

/* ------------------------------------------------------------------
   ✅ EXPORT
------------------------------------------------------------------- */
module.exports = router;
