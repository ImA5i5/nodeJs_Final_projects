// app/controllers/api/ApiChatController.js
const ChatRoom = require("../../models/ChatRoom");
const Message = require("../../models/Message");
const FileService = require("../../services/file.service");
const winston = require("../../config/winston");

class ApiChatController {
  /**
   * ✅ Create or Get Chat Room
   * POST /api/chat/start
   * Body: { freelancerId, projectId? }
   */
  static async startChat(req, res) {
    try {
      const clientId = req.user._id;
      const { freelancerId, projectId } = req.body;

      if (!freelancerId) {
        return res.status(400).json({ message: "Freelancer ID required" });
      }

      // ✅ Check existing chat between client & freelancer
      let room = await ChatRoom.findOne({
        client: clientId,
        freelancer: freelancerId,
        project: projectId || null,
      });

      if (!room) {
        room = await ChatRoom.create({
          client: clientId,
          freelancer: freelancerId,
          project: projectId || null,
        });
        winston.info(`✅ Chat room created: Client(${clientId}) ↔ Freelancer(${freelancerId})`);
      }

      // ✅ Notify freelancer in real-time (if online)
      if (global.io) {
        global.io.to(`user_${freelancerId}`).emit("notification", {
          type: "newChat",
          message: "💬 New chat started with a client.",
          roomId: room._id,
        });
      }

      return res.json({
        message: "Chat room ready",
        room,
      });
    } catch (err) {
      winston.error("Start Chat Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ Send Message (Client or Freelancer)
   * POST /api/chat/:roomId/message
   * Auto-detects receiverId from room
   */
  static async sendMessage(req, res) {
    try {
      const { room } = req; // ✅ from verifyChatAccess
      const senderId = req.user._id;
      const { content, messageType } = req.body;

      // ✅ Determine receiver automatically
      const receiverId =
        room.client.toString() === senderId.toString()
          ? room.freelancer
          : room.client;

      // ✅ Handle file upload (if any)
      let fileUrl = null;
      if (req.file) {
        fileUrl = await FileService.uploadFile(req.file.path, "chat_files");
      }

      // ✅ Save message
      const message = await Message.create({
        room: room._id,
        project: room.project,
        sender: senderId,
        receiver: receiverId,
        content,
        file: fileUrl,
        messageType: messageType || (fileUrl ? "file" : "text"),
      });

      // ✅ Emit to chat room and user notification
      if (global.io) {
        global.io.to(room._id.toString()).emit("newMessage", message);

        // notify receiver (personal channel)
        global.io.to(`user_${receiverId}`).emit("notification", {
          from: senderId,
          message: content || "📎 File attachment",
          roomId: room._id,
        });
      }

      return res.status(201).json({
        message: "Message sent successfully",
        data: message,
      });
    } catch (err) {
      winston.error("Send Message Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ Get All Messages in Room
   * GET /api/chat/:roomId/messages
   */
  static async getMessages(req, res) {
    try {
      const { room } = req;

      const messages = await Message.find({ room: room._id })
        .populate("sender", "fullName role")
        .populate("receiver", "fullName role")
        .sort({ createdAt: 1 });

      // ✅ Mark unread messages as "read"
      await Message.updateMany(
        { room: room._id, receiver: req.user._id, status: { $ne: "read" } },
        { status: "read" }
      );

      return res.json({ roomId: room._id, messages });
    } catch (err) {
      winston.error("Get Messages Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ Archive Chat (Both client & freelancer)
   * PATCH /api/chat/:roomId/archive
   */
  static async archiveChat(req, res) {
    try {
      const { room } = req;

      if (!room.archivedBy) room.archivedBy = [];
      if (!room.archivedBy.includes(req.user._id)) {
        room.archivedBy.push(req.user._id);
      }

      await room.save();
      return res.json({ message: "Chat archived successfully" });
    } catch (err) {
      winston.error("Archive Chat Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ Raise Dispute (Flag Abusive Behavior)
   * PATCH /api/chat/:roomId/dispute
   */
  static async raiseDispute(req, res) {
    try {
      const { room } = req;
      const { reason } = req.body;

      if (!reason) return res.status(400).json({ message: "Reason is required" });

      // Optional: Create a Dispute entry in your Dispute model later
      winston.warn(`🚨 Dispute raised for room ${room._id}: ${reason}`);

      if (global.io) {
        global.io.emit("disputeRaised", { roomId: room._id, reason });
      }

      return res.json({ message: "Dispute raised successfully" });
    } catch (err) {
      winston.error("Raise Dispute Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = ApiChatController;
