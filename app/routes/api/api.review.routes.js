// app/routes/api/api.review.routes.js
const express = require("express");
const router = express.Router();

const ApiReviewController = require("../../controllers/api/ApiReviewController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");

// 🔐 Secure all routes
router.use(ApiAuth.verifyAccessToken);

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Client reviews, freelancer replies, and admin moderation
 */

/**
 * @swagger
 * /api/review/{projectId}:
 *   post:
 *     summary: Client submits a review after project completion
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the completed project
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, feedback]
 *             properties:
 *               rating:
 *                 type: number
 *                 example: 5
 *               feedback:
 *                 type: string
 *                 example: "Excellent freelancer, very professional!"
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["communication", "quality", "on-time"]
 *     responses:
 *       201:
 *         description: Review submitted successfully
 *       400:
 *         description: Review already submitted or invalid data
 */
router.post("/:projectId", ApiRole.allow("client"), ApiReviewController.createReview);

/**
 * @swagger
 * /api/review/{reviewId}/reply:
 *   patch:
 *     summary: Freelancer replies to a review (one-time)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: reviewId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the review to reply to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reply]
 *             properties:
 *               reply:
 *                 type: string
 *                 example: "Thank you! It was great working with you."
 *     responses:
 *       200:
 *         description: Reply added successfully
 *       400:
 *         description: Already replied or invalid action
 */
router.patch("/:reviewId/reply", ApiRole.allow("freelancer"), ApiReviewController.replyToReview);

/**
 * @swagger
 * /api/review/{reviewId}/moderate:
 *   patch:
 *     summary: Admin moderates a review (remove or restore)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: reviewId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID to moderate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [remove, restore]
 *                 example: "remove"
 *               adminNote:
 *                 type: string
 *                 example: "Removed due to abusive language."
 *     responses:
 *       200:
 *         description: Review moderation updated
 */
router.patch("/:reviewId/moderate", ApiRole.allow("admin"), ApiReviewController.moderateReview);

/**
 * @swagger
 * /api/review/freelancer/{freelancerId}:
 *   get:
 *     summary: View all reviews for a freelancer's public profile
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: freelancerId
 *         in: path
 *         required: true
 *         description: Freelancer user ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reviews for freelancer
 */
router.get(
  "/freelancer/:freelancerId",
  ApiRole.allow("client", "freelancer", "admin"),
  ApiReviewController.getFreelancerReviews
);

/**
 * @swagger
 * /api/review/my:
 *   get:
 *     summary: Client views all reviews they have submitted
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of client's submitted reviews
 */
router.get("/my", ApiRole.allow("client"), ApiReviewController.getMyReviews);

module.exports = router;
