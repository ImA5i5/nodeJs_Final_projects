// app/routes/ClientHire.routes.js
const express = require("express");
const router = express.Router();

const ClientHireController = require("../controllers/ClientHireController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");

// ✅ Secure all routes
router.use(AuthMiddleware.verifyAccessToken);
router.use(RoleMiddleware.authorizeRoles("client"));

/**
 * 🔍 Browse freelancers
 * GET /client/hire
 */
router.get("/hire", ClientHireController.browseFreelancers);

/**
 * 👀 View freelancer profile
 * GET /client/hire/:id
 */
router.get("/view/:id", ClientHireController.viewFreelancerProfile);


/**
 * 💼 View all hired freelancers (client’s assigned projects)
 * GET /client/hired-projects
 */
router.get("/hired-projects", ClientHireController.viewHiredProjects);


/**
 * 💬 View all proposals (bids)
 * GET /client/proposals
 */
router.get("/proposals", ClientHireController.viewProposals);

/**
 * ⭐ Shortlist proposal
 * POST /client/proposals/:id/shortlist
 */
router.post("/proposals/:id/shortlist", ClientHireController.shortlistProposal);

/**
 * ✅ Accept proposal (hire freelancer)
 * POST /client/proposals/:id/accept
 */
router.post("/proposals/:id/accept", ClientHireController.acceptProposal);

/**
 * ❌ Reject proposal
 * POST /client/proposals/:id/reject
 */
router.post("/proposals/:id/reject", ClientHireController.rejectProposal);

/**
 * ⚡ Direct hire (optional)
 * POST /client/hire/:freelancerId/:projectId
 */
router.post("/hire/:freelancerId/:projectId", ClientHireController.hireFreelancer);


// ✅ Client approves final work (marks project as completed)
router.post(
  "/project/:id/approve-final",
  ClientHireController.approveFinalWork
);

module.exports = router;
