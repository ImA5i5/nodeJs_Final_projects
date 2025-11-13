// app/routes/api/api.chat.routes.js
const express = require("express");
const router = express.Router();

const ApiChatController = require("../../controllers/api/ApiChatController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const Upload = require("../../middleware/upload.middleware");
const verifyChatAccess = require("../../middleware/verifyChatAccess.middleware");

// 🔐 Authenticate all chat routes
router.use(ApiAuth.verifyAccessToken);

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Real-time messaging between client & freelancer
 */

/**
 * @swagger
 * /api/chat/start:
 *   post:
 *     summary: Start a chat between client and freelancer
 *     description: Creates or returns an existing chat room.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [freelancerId]
 *             properties:
 *               freelancerId:
 *                 type: string
 *                 example: "673cfedb92a0b57d93115b92"
 *               projectId:
 *                 type: string
 *                 example: "673d1a0f9af321b29d1e6d42"
 *     responses:
 *       200:
 *         description: Chat room created or fetched successfully
 */
router.post("/start", ApiChatController.startChat);

/**
 * @swagger
 * /api/chat/{roomId}/message:
 *   post:
 *     summary: Send a chat message (text or file)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: roomId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat room ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Hello, I have attached the logo file."
 *               file:
 *                 type: string
 *                 format: binary
 *               messageType:
 *                 type: string
 *                 enum: [text, file, delivery, revision]
 *                 example: "text"
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
router.post(
  "/:roomId/message",
  verifyChatAccess,
  Upload.single("file"),
  ApiChatController.sendMessage
);

/**
 * @swagger
 * /api/chat/{roomId}/messages:
 *   get:
 *     summary: Get all messages in a chat room
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: roomId
 *         in: path
 *         required: true
 *         description: Chat room ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages fetched successfully
 */
router.get(
  "/:roomId/messages",
  verifyChatAccess,
  ApiChatController.getMessages
);

/**
 * @swagger
 * /api/chat/{roomId}/archive:
 *   patch:
 *     summary: Archive a chat room
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat room ID
 *     responses:
 *       200:
 *         description: Chat archived successfully
 */
router.patch(
  "/:roomId/archive",
  verifyChatAccess,
  ApiChatController.archiveChat
);

/**
 * @swagger
 * /api/chat/{roomId}/dispute:
 *   patch:
 *     summary: Raise a dispute from the chat
 *     description: Flags abusive behavior or disagreement.
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chat room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Freelancer being unresponsive"
 *     responses:
 *       200:
 *         description: Dispute raised successfully
 */
router.patch(
  "/:roomId/dispute",
  verifyChatAccess,
  ApiChatController.raiseDispute
);

module.exports = router;
