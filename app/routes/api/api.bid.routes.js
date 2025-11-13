// app/routes/api/api.bid.routes.js

const express = require("express");
const router = express.Router();

const ApiBidController = require("../../controllers/api/ApiBidController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");

/**
 * @swagger
 * tags:
 *   name: Bids
 *   description: Freelancer bidding + Client bid management APIs
 */

// 🔐 All bid routes require authentication
router.use(ApiAuth.verifyAccessToken);

/**
 * @swagger
 * /api/bid/{projectId}:
 *   post:
 *     summary: Freelancer submits a bid on a project
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         description: Project ID
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, deliveryTime, coverLetter]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1200
 *               deliveryTime:
 *                 type: string
 *                 example: "7 days"
 *               coverLetter:
 *                 type: string
 *                 example: "I can deliver professional quality work within 7 days."
 *     responses:
 *       201:
 *         description: Bid submitted successfully
 */
router.post(
  "/:projectId",
  ApiRole.allow("freelancer"),
  ApiBidController.submitBid
);

/**
 * @swagger
 * /api/bid/{bidId}:
 *   delete:
 *     summary: Freelancer withdraws a bid
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bidId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bid withdrawn successfully
 */
router.delete(
  "/:bidId",
  ApiRole.allow("freelancer"),
  ApiBidController.withdrawBid
);

/**
 * @swagger
 * /api/bid/project/{projectId}:
 *   get:
 *     summary: Client views all bids for a project
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *     responses:
 *       200:
 *         description: List of bids for this project
 */
router.get(
  "/project/:projectId",
  ApiRole.allow("client"),
  ApiBidController.getBidsForProject
);

/**
 * @swagger
 * /api/bid/{bidId}/shortlist:
 *   patch:
 *     summary: Client shortlists a freelancer's bid
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bidId
 *         in: path
 *         required: true
 *     responses:
 *       200:
 *         description: Bid shortlisted
 */
router.patch(
  "/:bidId/shortlist",
  ApiRole.allow("client"),
  ApiBidController.shortlistBid
);

/**
 * @swagger
 * /api/bid/{bidId}/reject:
 *   patch:
 *     summary: Client rejects a freelancer's bid
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bidId
 *         in: path
 *         required: true
 *     responses:
 *       200:
 *         description: Bid rejected
 */
router.patch(
  "/:bidId/reject",
  ApiRole.allow("client"),
  ApiBidController.rejectBid
);

/**
 * @swagger
 * /api/bid/{bidId}/accept:
 *   patch:
 *     summary: Client accepts a bid (project status changes to 'assigned')
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bidId
 *         in: path
 *         required: true
 *     responses:
 *       200:
 *         description: Bid accepted and project updated
 */
router.patch(
  "/:bidId/accept",
  ApiRole.allow("client"),
  ApiBidController.acceptBid
);

/**
 * @swagger
 * /api/bid/{bidId}/hire:
 *   patch:
 *     summary: Client hires freelancer (auto-assign project + notify + reject others)
 *     description: 
 *       - Hires freelancer  
 *       - Sets project.hiredFreelancer  
 *       - Sets project.status = assigned  
 *       - Sends email to freelancer  
 *       - Rejects all other bids  
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: bidId
 *         in: path
 *         required: true
 *         description: ID of bid to hire
 *     responses:
 *       200:
 *         description: Freelancer hired successfully
 */
router.patch(
  "/:bidId/hire",
  ApiRole.allow("client"),
  ApiBidController.hireFreelancer
);

module.exports = router;
