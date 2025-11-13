// app/routes/api/api.payment.routes.js

const express = require("express");
const router = express.Router();

const ApiPaymentController = require("../../controllers/api/ApiPaymentController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");

// 🔐 All payment routes require authentication
router.use(ApiAuth.verifyAccessToken);

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment, Escrow, Wallet & Dispute handling
 */

/**
 * @swagger
 * /api/payment/create-order:
 *   post:
 *     summary: Create Razorpay order for milestone funding
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [milestoneId, amount]
 *             properties:
 *               milestoneId:
 *                 type: string
 *                 example: "673d1a0f9af321b29d1e6d42"
 *               amount:
 *                 type: number
 *                 example: 7500
 *     responses:
 *       200:
 *         description: Razorpay order created successfully
 */
router.post(
  "/create-order",
  ApiRole.allow("client"),
  ApiPaymentController.createOrder
);

/**
 * @swagger
 * /api/payment/verify:
 *   post:
 *     summary: Verify Razorpay payment after checkout success
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, paymentId, signature, milestoneId, amount]
 *             properties:
 *               orderId:
 *                 type: string
 *                 example: "order_JxPzkSG8l4oH9X"
 *               paymentId:
 *                 type: string
 *                 example: "pay_JxPzlZFR4bar2t"
 *               signature:
 *                 type: string
 *                 example: "5e1ffc0e610c6e..."
 *               milestoneId:
 *                 type: string
 *                 example: "673d1a0f9af321b29d1e6d42"
 *               amount:
 *                 type: number
 *                 example: 7500
 *     responses:
 *       200:
 *         description: Payment verified and escrow funded
 */
router.post(
  "/verify",
  ApiRole.allow("client"),
  ApiPaymentController.verifyPayment
);

/**
 * @swagger
 * /api/payment/milestone/{id}/release:
 *   patch:
 *     summary: Client releases milestone payment to freelancer
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Milestone ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment released successfully
 */
router.patch(
  "/milestone/:id/release",
  ApiRole.allow("client"),
  ApiPaymentController.releaseMilestone
);

/**
 * @swagger
 * /api/payment/{id}/refund:
 *   patch:
 *     summary: Admin refunds milestone payment to client
 *     tags: [Payments]
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
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 5000
 *               reason:
 *                 type: string
 *                 example: "Work quality not acceptable"
 *     responses:
 *       200:
 *         description: Refund processed successfully
 */
router.patch(
  "/:id/refund",
  ApiRole.allow("admin"),
  ApiPaymentController.refundPayment
);

/**
 * @swagger
 * /api/payment/wallet:
 *   get:
 *     summary: Get logged-in user's wallet balance
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet details retrieved
 */
router.get(
  "/wallet",
  ApiRole.allow("client", "freelancer"),
  ApiPaymentController.getWalletBalance
);

/**
 * @swagger
 * /api/payment/dispute:
 *   post:
 *     summary: Raise payment dispute (client or freelancer)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [milestoneId, reason]
 *             properties:
 *               milestoneId:
 *                 type: string
 *                 example: "673d1a0f9af321b29d1e6d42"
 *               reason:
 *                 type: string
 *                 example: "Freelancer submitted incomplete deliverables"
 *     responses:
 *       200:
 *         description: Dispute raised successfully
 */
router.post(
  "/dispute",
  ApiRole.allow("client", "freelancer"),
  ApiPaymentController.raiseDispute
);

/**
 * @swagger
 * /api/payment/history:
 *   get:
 *     summary: Get all transactions of logged-in user (client, freelancer, admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history retrieved
 */
router.get(
  "/history",
  ApiRole.allow("client", "freelancer", "admin"),
  ApiPaymentController.getPaymentHistory
);

module.exports = router;
