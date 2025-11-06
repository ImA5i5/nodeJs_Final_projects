const express = require("express");
const router = express.Router();
const ChatController = require("../controllers/ChatController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");
const UploadMiddleware = require("../middleware/upload.middleware");
const Message = require("../models/Message");
const User = require("../models/User");

router.use(AuthMiddleware.verifyAccessToken);
router.use(RoleMiddleware.authorizeRoles("client"));

// 💬 Chat Inbox

router.get("/chat-list", async (req, res, next) => {
  try {
    const chats = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: req.user._id }, { receiver: req.user._id }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", req.user._id] },
              "$receiver",
              "$sender",
            ],
          },
          lastMessage: { $first: "$content" },
          createdAt: { $first: "$createdAt" },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    const populatedChats = await Promise.all(
      chats.map(async (c) => {
        const user = await User.findById(c._id).lean();
        return { otherUser: user, lastMessage: c.lastMessage };
      })
    );

    res.render("pages/client/chat-list", {
      layout: "layouts/client-layout",
      title: "Chat Inbox",
      chats: populatedChats,
    });
  } catch (err) {
    next(err);
  }
});

// 💭 Chat Room (client ↔ freelancer)
router.get("/chat/:id", ChatController.chatRoom);

// 📤 Send message (text + file)
router.post("/chat/send", UploadMiddleware.single("file"), ChatController.sendMessage);

// 🔄 Fetch messages via AJAX
router.get("/chat/messages/:receiverId", ChatController.getMessages);

module.exports = router;
