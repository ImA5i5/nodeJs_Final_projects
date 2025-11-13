// app/routes/api/api.project.routes.js
const express = require("express");
const router = express.Router();

const ApiProjectController = require("../../controllers/api/ApiProjectController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");
const Upload = require("../../middleware/upload.middleware");

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Client, Freelancer & Admin Project Management APIs
 */

// 🔐 All project routes require login
router.use(ApiAuth.verifyAccessToken);

/**
 * @swagger
 * /api/project:
 *   post:
 *     summary: Client creates a new project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, description, category, budget]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Build a MERN Marketplace App
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               subcategory:
 *                 type: string
 *               budget:
 *                 type: number
 *                 example: 500
 *               duration:
 *                 type: string
 *                 example: 14 days
 *               paymentType:
 *                 type: string
 *                 enum: [fixed, hourly]
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Project created (pending admin approval)
 */
router.post(
  "/",
  ApiRole.allow("client"),
  Upload.multiple("attachments", 5),
  ApiProjectController.createProject
);

/**
 * @swagger
 * /api/project/{projectId}:
 *   put:
 *     summary: Client edits own project (only when pending)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of project to update
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               title: Updated Project Title
 *               budget: 600
 *     responses:
 *       200:
 *         description: Project updated successfully
 */
router.put(
  "/:projectId",
  ApiRole.allow("client"),
  ApiProjectController.editProject
);

/**
 * @swagger
 * /api/project/my-projects:
 *   get:
 *     summary: Client gets all his projects
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of client projects
 */
router.get(
  "/my-projects",
  ApiRole.allow("client"),
  ApiProjectController.getMyProjects
);

/**
 * @swagger
 * /api/project/client/approve/{projectId}:
 *   patch:
 *     summary: Client approves freelancer's final submission → marks project completed
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project marked as completed
 */
router.patch(
  "/client/approve/:projectId",
  ApiRole.allow("client"),
  ApiProjectController.approveCompletedProject
);





// ---------------------------------------------------------
// FREELANCER ROUTES
// ---------------------------------------------------------

/**
 * @swagger
 * /api/project/browse:
 *   get:
 *     summary: Freelancer browses only approved projects
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of approved projects
 */
router.get(
  "/browse",
  ApiRole.allow("freelancer"),
  ApiProjectController.browseProjects
);

/**
 * @swagger
 * /api/project/freelancer/accept/{projectId}:
 *   patch:
 *     summary: Freelancer accepts assigned project → assigned → in-progress
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Freelancer accepted project & status updated
 */
router.patch(
  "/freelancer/accept/:projectId",
  ApiRole.allow("freelancer"),
  ApiProjectController.freelancerAcceptProject
);

/**
 * @swagger
 * /api/project/freelancer/submit/{projectId}:
 *   patch:
 *     summary: Freelancer submits final deliverables (files)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               deliverables:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Deliverables submitted, project status → submitted
 */
router.patch(
  "/freelancer/submit/:projectId",
  ApiRole.allow("freelancer"),
  Upload.multiple("deliverables", 5),
  ApiProjectController.submitFinalDeliverables
);



// ---------------------------------------------------------
// ADMIN ROUTES
// ---------------------------------------------------------

/**
 * @swagger
 * /api/project/admin/all:
 *   get:
 *     summary: Admin gets all projects (all statuses)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All projects fetched
 */
router.get(
  "/admin/all",
  ApiRole.allow("admin"),
  ApiProjectController.adminGetAll
);

/**
 * @swagger
 * /api/project/admin/approve/{projectId}:
 *   put:
 *     summary: Admin approves a project (pending → approved)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project approved
 */
router.put(
  "/admin/approve/:projectId",
  ApiRole.allow("admin"),
  ApiProjectController.approveProject
);

/**
 * @swagger
 * /api/project/admin/reject/{projectId}:
 *   put:
 *     summary: Admin rejects a project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *     responses:
 *       200:
 *         description: Project rejected
 */
router.put(
  "/admin/reject/:projectId",
  ApiRole.allow("admin"),
  ApiProjectController.rejectProject
);

module.exports = router;
