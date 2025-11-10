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
  try {
    const projects = await Project.find({ client: req.user._id }).select("_id title").lean();

    const project = projects[0] || null;

    let milestones = [];

    if (project) {
      milestones = await Milestone.find({ project: project._id })
        .populate("project", "title")
        .lean();
    }

    res.render("pages/client/milestones", {
      layout: "layouts/client-layout",
      title: "My Milestones",
      project,
      milestones,
      razorpayKey: process.env.RAZORPAY_KEY_ID   // ✅ FIXED
    });
  } catch (err) {
    next(err);
  }
});



router.get(
  "/projects/:id/milestones",
  RoleMiddleware.authorizeRoles("client"),
  async (req, res, next) => {
    try {
      const projects = await Project.find({ client: req.user._id })
        .select("_id title")
        .lean();

      const projectIds = projects.map(p => p._id);

      const milestones = await Milestone.find({
        project: { $in: projectIds }
      })
      .populate("project", "title")
      .lean();

      res.render("pages/client/milestones-all", {
        layout: "layouts/client-layout",
        title: "All Milestones",
        projects,
        milestones,
        razorpayKey: process.env.RAZORPAY_KEY_ID   // ✅ FIXED
      });

    } catch (err) {
      next(err);
    }
  }
);





/* ------------------------------------------------------------------
   💸 PAYMENTS (Client) — FIXED
------------------------------------------------------------------- */

// ✅ View payments page (history page)
router.get(
  "/payments/:projectId",
  RoleMiddleware.authorizeRoles("client"),
  async (req, res) => {
    try {
      const Project = require("../models/Project");
      const Milestone = require("../models/Milestone");

      // ✅ Find project owned by this client
      const project = await Project.findOne({
        _id: req.params.projectId,
        client: req.user._id
      }).lean();

      if (!project) {
        return res.status(404).render("pages/error", {
          layout: "layouts/client-layout",
          message: "Project not found"
        });
      }

      // ✅ Fetch milestones for this project only
      const milestones = await Milestone.find({
        project: project._id
      }).lean();

      res.render("pages/client/payments", {
        layout: "layouts/client-layout",
        project,
        milestones,
        razorpayKey: process.env.RAZORPAY_KEY_ID
      });

    } catch (err) {
      console.error("Project Payments Error:", err);
      res.status(500).send("Server Error");
    }
  }
);

router.get(
  "/payments",
  RoleMiddleware.authorizeRoles("client"),
  async (req, res) => {
    try {
      const Project = require("../models/Project");
      const Milestone = require("../models/Milestone");

      const projects = await Project.find({ client: req.user._id })
        .select("_id title")
        .lean();

      const projectIds = projects.map(p => p._id);

      const milestones = await Milestone.find({
        project: { $in: projectIds }
      })
        .populate("project", "title")
        .lean();

      res.render("pages/client/payments-all", {
        layout: "layouts/client-layout",
        projects,
        milestones,
        razorpayKey: process.env.RAZORPAY_KEY_ID
      });
    } catch (err) {
      console.error("Payments-All Error:", err);
      res.status(500).send("Server Error");
    }
  }
);



// ✅ Create Razorpay Order
router.post("/payments/create-order", PaymentController.createOrder);

// ✅ Verify Razorpay Payment
router.post("/payments/verify", PaymentController.verify);

// ✅ Release Milestone Payment
router.post("/payments/release", PaymentController.release);




/* ------------------------------------------------------------------
   ✅ EXPORT
------------------------------------------------------------------- */
module.exports = router;
