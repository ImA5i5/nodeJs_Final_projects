// app/routes/chat.routes.js

const express = require("express");
const router = express.Router();

const ChatController = require("../controllers/ChatController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");
const Upload = require("../middleware/upload.middleware");

router.use(AuthMiddleware.verifyAccessToken);

// ✅ latest chat
router.get(
  "/room/latest",
  RoleMiddleware.authorizeRoles("client", "freelancer"),
  ChatController.openLatestChat
);

// ✅ open chat room
router.get(
  "/room/:roomId",
  RoleMiddleware.authorizeRoles("client", "freelancer"),
  ChatController.openChat
);

// ✅ chat list
router.get(
  "/list",
  RoleMiddleware.authorizeRoles("client", "freelancer"),
  ChatController.chatList
);

// ✅ start chat
router.post(
  "/start",
  RoleMiddleware.authorizeRoles("client", "freelancer"),
  ChatController.startChat
);

// ✅ send text message
router.post(
  "/send",
  RoleMiddleware.authorizeRoles("client", "freelancer"),
  ChatController.sendMessage
);

// ✅ file upload message
router.post(
  "/upload",
  RoleMiddleware.authorizeRoles("client", "freelancer"),
  Upload.single("file"),    // ✅ IMPORTANT
  ChatController.uploadFile
);

// ✅ fetch messages
router.get(
  "/messages/:roomId",
  RoleMiddleware.authorizeRoles("client", "freelancer"),
  ChatController.fetchMessages
);

router.get(
  "/notifications",
  RoleMiddleware.authorizeRoles("client", "freelancer"),
  ChatController.getNotifications
);


module.exports = router;
