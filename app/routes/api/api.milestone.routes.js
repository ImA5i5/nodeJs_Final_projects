// app/routes/api/api.milestone.routes.js

const express = require("express");
const router = express.Router();

const ApiMilestoneController = require("../../controllers/api/ApiMilestoneController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");
const Upload = require("../../middleware/upload.middleware");

// 🔐 All milestone routes require authentication
router.use(ApiAuth.verifyAccessToken);

/**
 * @swagger
 * tags:
 *   name: Milestones
 *   description: Project milestone management APIs
 */

/**
 * @swagger
 * /api/milestone/{id}:
 *   get:
 *     summary: Get a single milestone by ID
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Milestone ID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Milestone details retrieved
 */
router.get(
  "/:id",
  ApiRole.allow("client"),
  ApiMilestoneController.getMilestoneById
);

/**
 * @swagger
 * /api/milestone/{projectId}:
 *   post:
 *     summary: Client creates a new milestone for project
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, amount, dueDate]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "UI Design Phase"
 *               description:
 *                 type: string
 *                 example: "Complete homepage + dashboard UI"
 *               amount:
 *                 type: number
 *                 example: 5000
 *               dueDate:
 *                 type: string
 *                 example: "2025-05-12"
 *     responses:
 *       201:
 *         description: Milestone created successfully
 */
router.post(
  "/:projectId",
  ApiRole.allow("client"),
  ApiMilestoneController.createMilestone
);

/**
 * @swagger
 * /api/milestone/{id}/fund:
 *   patch:
 *     summary: Client funds milestone (Razorpay escrow)
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Milestone ID
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, razorpayPaymentId]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 5000
 *               razorpayPaymentId:
 *                 type: string
 *                 example: "pay_29QQoUBi66xm2f"
 *     responses:
 *       200:
 *         description: Escrow funded successfully
 */
router.patch(
  "/:id/fund",
  ApiRole.allow("client"),
  ApiMilestoneController.fundMilestone
);

/**
 * @swagger
 * /api/milestone/{id}/release:
 *   patch:
 *     summary: Client releases payment to freelancer
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Milestone ID
 *         required: true
 *     responses:
 *       200:
 *         description: Payment released to freelancer wallet
 */
router.patch(
  "/:id/release",
  ApiRole.allow("client"),
  ApiMilestoneController.releasePayment
);

/**
 * @swagger
 * /api/milestone/{id}/revision:
 *   patch:
 *     summary: Client requests revision from freelancer
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Milestone ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notes]
 *             properties:
 *               notes:
 *                 type: string
 *                 example: "Please improve the spacing and add animations."
 *     responses:
 *       200:
 *         description: Revision request sent successfully
 */
router.patch(
  "/:id/revision",
  ApiRole.allow("client"),
  ApiMilestoneController.requestRevision
);

/**
 * @swagger
 * /api/milestone/{id}/accept:
 *   patch:
 *     summary: Freelancer accepts milestone created by client
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Milestone ID
 *         required: true
 *     responses:
 *       200:
 *         description: Milestone accepted by freelancer
 */
router.patch(
  "/:id/accept",
  ApiRole.allow("freelancer"),
  ApiMilestoneController.acceptMilestone
);

/**
 * @swagger
 * /api/milestone/{id}/start:
 *   patch:
 *     summary: Freelancer starts milestone work
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         description: Milestone ID
 *         required: true
 *     responses:
 *       200:
 *         description: Milestone work started
 */
router.patch(
  "/:id/start",
  ApiRole.allow("freelancer"),
  ApiMilestoneController.startWork
);

/**
 * @swagger
 * /api/milestone/{id}/submit:
 *   patch:
 *     summary: Freelancer submits milestone deliverables
 *     tags: [Milestones]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Milestone ID
 *     requestBody:
 *       required: false
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
 *         description: Work submitted successfully
 */
router.patch(
  "/:id/submit",
  ApiRole.allow("freelancer"),
  Upload.multiple("deliverables", 5),
  ApiMilestoneController.submitWork
);

module.exports = router;
