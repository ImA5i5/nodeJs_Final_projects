// app/controllers/ChatController.js
const Message = require("../models/Message");
const User = require("../models/User");
const Notification = require("../models/Notification");
const cloudinary = require("../config/cloudinary");
const winston = require("../config/winston");

class ChatController {
  /**
   * 💬 Render chat room between freelancer & client
   */
  static async chatRoom(req, res, next) {
    try {
      const receiverId = req.params.id;

      // Mark all unread messages from receiver → as read
      await Message.updateMany(
        { sender: receiverId, receiver: req.user._id, isRead: false },
        { $set: { isRead: true } }
      );

      // Fetch all messages in conversation
      const messages = await Message.find({
        $or: [
          { sender: req.user._id, receiver: receiverId },
          { sender: receiverId, receiver: req.user._id },
        ],
      })
        .populate("sender receiver", "fullName role profile.profilePic")
        .sort({ createdAt: 1 });

      const receiver = await User.findById(receiverId).lean();

      res.render("pages/freelancer/chat", {
        layout: "layouts/freelancer-layout",
        title: `Chat with ${receiver.fullName}`,
        messages,
        receiver,
        user: req.user,
      });
    } catch (err) {
      winston.error("ChatRoom Error: " + err.message);
      next(err);
    }
  }

  /**
   * 📤 Send a message (text or file)
   */
  static async sendMessage(req, res) {
    try {
      const { receiverId, content, projectId } = req.body;
      let fileUrl = null;

      // Optional file upload
      if (req.file) {
        const uploaded = await cloudinary.uploader.upload(req.file.path, {
          folder: "freelancer_chat_files",
        });
        fileUrl = uploaded.secure_url;
      }

      // Create the message
      const message = await Message.create({
        project: projectId || null,
        sender: req.user._id,
        receiver: receiverId,
        content,
        file: fileUrl,
      });

      // 🔔 Create Notification for Receiver
      await Notification.create({
        user: receiverId,
        message: `${req.user.fullName} sent you a message.`,
        type: "message",
      });

      // 🔄 Emit real-time event to both users
      const io = req.app.get("io");
      io.to(receiverId.toString()).emit("newMessage", {
        sender: req.user._id,
        content,
        file: fileUrl,
        createdAt: message.createdAt,
      });

      res.status(201).json({ success: true, message });
    } catch (err) {
      winston.error("SendMessage Error: " + err.message);
      res.status(500).json({ success: false, message: "Failed to send message" });
    }
  }

  /**
   * 📬 Fetch messages between two users (AJAX refresh)
   */
  static async getMessages(req, res) {
    try {
      const { receiverId } = req.params;

      const messages = await Message.find({
        $or: [
          { sender: req.user._id, receiver: receiverId },
          { sender: receiverId, receiver: req.user._id },
        ],
      })
        .populate("sender receiver", "fullName profile.profilePic")
        .sort({ createdAt: 1 });

      // Mark messages as read
      await Message.updateMany(
        { sender: receiverId, receiver: req.user._id, isRead: false },
        { $set: { isRead: true } }
      );

      res.json({ success: true, messages });
    } catch (err) {
      winston.error("GetMessages Error: " + err.message);
      res.status(500).json({ success: false, message: "Error loading messages" });
    }
  }

  /**
   * 🔔 Fetch unread messages count (for notifications or badges)
   */
  static async unreadCount(req, res) {
    try {
      const count = await Message.countDocuments({
        receiver: req.user._id,
        isRead: false,
      });

      res.json({ success: true, unreadCount: count });
    } catch (err) {
      winston.error("UnreadCount Error: " + err.message);
      res.status(500).json({ success: false, message: "Error counting unread messages" });
    }
  }

  /**
   * 📜 Fetch all chat partners (chat list)
   */
 static async chatList(req, res, next) {
    try {
      // Get all chat partners (freelancer’s active conversations)
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

      // Populate user info for display
      const populatedChats = await Promise.all(
        chats.map(async (chat) => {
          const otherUser = await User.findById(chat._id).lean();
          return {
            otherUser,
            lastMessage: chat.lastMessage,
            createdAt: chat.createdAt,
          };
        })
      );

      res.render("pages/freelancer/chat-list", {
        layout: "layouts/freelancer-layout",
        title: "Messages",
        chats: populatedChats,
      });
    } catch (err) {
      next(err);
    }
  }

   /**
   * 🔔 Fetch alerts (new messages, deliverables, etc.)
   */
  static async getAlerts(req, res) {
    try {
      const notifications = await Notification.find({
        user: req.user._id,
        isRead: false,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      res.json({ success: true, notifications });
    } catch (err) {
      res.status(500).json({ success: false, message: "Error loading notifications" });
    }
  }
}

module.exports = ChatController;
