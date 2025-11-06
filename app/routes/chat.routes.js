// app/routes/chat.routes.js
const express = require("express");
const router = express.Router();

const ChatController = require("../controllers/ChatController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");
const UploadMiddleware = require("../middleware/upload.middleware");

// ✅ Middleware: Protect all chat routes
router.use(AuthMiddleware.verifyAccessToken);
router.use(RoleMiddleware.authorizeRoles("freelancer", "client", "admin"));

/**
 * 💬 Chat Routes Overview
 * --------------------------
 * GET   /chat/list           -> Show user's active conversations
 * GET   /chat/room/:id       -> Open a specific chat
 * GET   /chat/messages/:id   -> Fetch conversation messages (AJAX)
 * POST  /chat/send           -> Send a message (text or file)
 * GET   /chat/unread-count   -> Get unread message count
 */

// 📜 All user chat list (recent chats)
router.get("/list", ChatController.chatList);

// 💬 Chat Room (Freelancer ↔ Client)
router.get("/room/:id", ChatController.chatRoom);

// 📩 Fetch messages (AJAX)
router.get("/messages/:receiverId", ChatController.getMessages);

// 📤 Send message (text + optional file upload)
router.post("/send", UploadMiddleware.single("file"), ChatController.sendMessage);

// 🔔 Unread message count (for notification badge)
router.get("/unread-count", ChatController.unreadCount);

module.exports = router;
