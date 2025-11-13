// app/controllers/ChatController.js

const ChatRoom = require("../models/ChatRoom");
const Message = require("../models/Message");
const FileService = require("../services/file.service");
const winston = require("../config/winston");

class ChatController {

  /* ---------------------------------------------------
    ✅ 1. CHAT LIST (client & freelancer)
  ----------------------------------------------------*/
  static async chatList(req, res) {
    try {
      const userId = req.user._id.toString();

      const rooms = await ChatRoom.find({
        $or: [{ client: userId }, { freelancer: userId }]
      })
        .populate("client freelancer", "fullName profile.profilePic")
        .sort({ updatedAt: -1 })
        .lean();

      // ✅ Add otherUser to each room
      rooms.forEach(room => {
        room.otherUser =
          room.client._id.toString() === userId
            ? room.freelancer
            : room.client;
      });

      res.render("pages/chat/chat-list", {
        layout:
          req.user.role === "client"
            ? "layouts/client-layout"
            : "layouts/freelancer-layout",
        rooms,
        user: req.user,
        userId
      });

    } catch (err) {
      winston.error("Chat List Error: " + err.message);
      res.status(500).send("Chat list loading failed");
    }
  }

  /* ---------------------------------------------------
    ✅ 2. OPEN CHAT ROOM
  ----------------------------------------------------*/
  static async openChat(req, res) {
    try {
      const roomId = req.params.roomId;
      const userId = req.user._id.toString();

      const room = await ChatRoom.findById(roomId)
        .populate("client freelancer", "fullName profile.profilePic")
        .lean();

      if (!room) return res.status(404).send("Chat room not found");

      const messages = await Message.find({ room: roomId })
        .sort({ createdAt: 1 })
        .lean();

      // ✅ Mark unread as read
      await Message.updateMany(
        { room: roomId, receiver: userId, status: { $ne: "read" } },
        { $set: { status: "read" } }
      );

      // ✅ Determine other participant
      const isClient = room.client._id.toString() === userId;
      const otherUser = isClient ? room.freelancer : room.client;

      res.render("pages/chat/chat-room", {
        layout:
          req.user.role === "client"
            ? "layouts/client-layout"
            : "layouts/freelancer-layout",
        title: `Chat with ${otherUser.fullName}`,
        room,
        messages,
        user: req.user,
        userId,
        otherUser
      });

    } catch (err) {
      winston.error("Open Chat Error: " + err.message);
      res.status(500).send("Chat loading failed");
    }
  }

  /* ---------------------------------------------------
    ✅ 3. SEND TEXT MESSAGE
  ----------------------------------------------------*/
  static async sendMessage(req, res) {
  try {
    const { roomId, content } = req.body;

    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found"
      });
    }

    const receiver =
      room.client.toString() === req.user._id.toString()
        ? room.freelancer
        : room.client;

    const message = await Message.create({
      room: roomId,
      project: room.project || null,
      sender: req.user._id,
      receiver,
      content,
      messageType: "text",
      status: "sent"
    });

    return res.json({
      success: true,
      message: "Message sent",
      data: message       // ✅ ALWAYS RETURNED
    });

  } catch (err) {
    winston.error("Send Message Error: " + err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send message"
    });
  }
}


  /* ---------------------------------------------------
    ✅ 4. UPLOAD FILE MESSAGE
  ----------------------------------------------------*/
  static async uploadFile(req, res) {
  try {
    const { roomId } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // ✅ Load chat room → to get client, freelancer, and project
    const room = await ChatRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    // ✅ receiver = opposite user
    const receiver =
      room.client.toString() === req.user._id.toString()
        ? room.freelancer
        : room.client;

    // ✅ Cloudinary URL (multer-storage-cloudinary gives secure_url as path)
    const fileUrl = req.file.path; // ✅ This is ALWAYS correct

    // ✅ Create message
    const msg = await Message.create({
      room: roomId,
      project: room.project, // ✅ REQUIRED or validation fails
      sender: req.user._id,
      receiver,
      file: fileUrl,
      messageType: "file",
      status: "sent",
    });

    // ✅ Emit real-time update
    global.io.to(roomId).emit("newMessage", msg);

    return res.json({
      success: true,
      message: "File uploaded successfully",
      data: msg,
    });
  } catch (err) {
    console.error("Upload ERROR:", err);
    winston.error("File Upload Error: " + err.message);
    res.status(500).json({
      success: false,
      message: "File upload failed",
    });
  }
}

  /* ---------------------------------------------------
    ✅ 5. FETCH MESSAGES (AJAX)
  ----------------------------------------------------*/
  static async fetchMessages(req, res) {
    try {
      const messages = await Message.find({ room: req.params.roomId })
        .sort({ createdAt: 1 })
        .lean();

      res.json({ success: true, messages });

    } catch (err) {
      winston.error("Fetch Messages Error: " + err.message);
      res.status(500).json({ success: false, message: "Failed to fetch messages" });
    }
  }

  /* ---------------------------------------------------
    ✅ 6. OPEN LATEST CHAT
  ----------------------------------------------------*/
  static async openLatestChat(req, res) {
    try {
      const userId = req.user._id;
      const room = await ChatRoom.findOne({
        $or: [{ client: userId }, { freelancer: userId }]
      })
        .sort({ updatedAt: -1 })
        .lean();

      if (!room) return res.redirect("/chat/list");

      res.redirect(`/chat/room/${room._id}`);

    } catch (err) {
      winston.error("Open Latest Chat Error: " + err.message);
      res.status(500).send("Failed to load latest chat");
    }
  }

  /* ---------------------------------------------------
    ✅ 7. START CHAT (client starts)
  ----------------------------------------------------*/
  static async startChat(req, res) {
  try {
    const userId = req.user._id;
    const { otherUserId, projectId = null } = req.body;

    if (!otherUserId) {
      return res.status(400).json({
        success: false,
        message: "otherUserId is required"
      });
    }

    // ✅ Determine roles automatically
    const isClient = req.user.role === "client";
    const clientId = isClient ? userId : otherUserId;
    const freelancerId = isClient ? otherUserId : userId;

    // ✅ Check if chat already exists (project optional)
    let room = await ChatRoom.findOne({
      client: clientId,
      freelancer: freelancerId,
      project: projectId // ✅ can be null!
    });

    if (!room) {
      room = await ChatRoom.create({
        client: clientId,
        freelancer: freelancerId,
        project: projectId
      });
    }

    return res.json({
      success: true,
      roomId: room._id,
      message: "Chat started successfully"
    });

  } catch (err) {
    winston.error("Start Chat Error: " + err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to start chat"
    });
  }
}


 static async getNotifications(req, res) {
  try {
    const userId = req.user._id;

    const notifications = await Message.find({
      receiver: userId,
      sender: { $ne: userId }   // ✅ show only messages from other user
    })
      .populate("sender", "fullName profile.profilePic")
      .sort({ createdAt: -1 })
      .lean();

    return res.render("pages/chat/notifications", {
      layout:
        req.user.role === "client"
          ? "layouts/client-layout"
          : "layouts/freelancer-layout",
      notifications,
      user: req.user,
    });

  } catch (err) {
    winston.error("Notifications Error: " + err.message);
    return res.status(500).send("Failed to load notifications");
  }
}




}

module.exports = ChatController;
