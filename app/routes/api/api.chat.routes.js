// app/routes/api/api.chat.routes.js
const express = require("express");
const router = express.Router();

const ApiChatController = require("../../controllers/api/ApiChatController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const Upload = require("../../middleware/upload.middleware");
const verifyChatAccess = require("../../middleware/verifyChatAccess.middleware");

// ✅ Authenticate all chat routes
router.use(ApiAuth.verifyAccessToken);

// ✅ Start a chat (client ↔ freelancer)
router.post("/start", ApiChatController.startChat);

// ✅ Send a message (text or file) — only room members
router.post("/:roomId/message", verifyChatAccess, Upload.single("file"), ApiChatController.sendMessage);

// ✅ Get messages in a chat room — only room members
router.get("/:roomId/messages", verifyChatAccess, ApiChatController.getMessages);

// ✅ Archive a chat — only room members
router.patch("/:roomId/archive", verifyChatAccess, ApiChatController.archiveChat);

// ✅ Raise dispute — only room members
router.patch("/:roomId/dispute", verifyChatAccess, ApiChatController.raiseDispute);

module.exports = router;
