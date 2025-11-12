// app/middleware/verifyChatAccess.middleware.js
const ChatRoom = require("../models/ChatRoom");
const winston = require("../config/winston");

/**
 * ✅ Ensures that only users who are part of a chat room (client or freelancer)
 *    can access its messages or send new ones.
 */
const verifyChatAccess = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await ChatRoom.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    // Check if logged-in user is client or freelancer in this room
    const isAuthorized =
      room.client.toString() === userId.toString() ||
      room.freelancer.toString() === userId.toString();

    if (!isAuthorized) {
      winston.warn(`🚫 Unauthorized chat access by user ${userId} for room ${roomId}`);
      return res.status(403).json({ message: "Unauthorized: You are not part of this chat" });
    }

    // ✅ Attach room to request for controller use
    req.room = room;
    next();

  } catch (err) {
    winston.error("Chat Access Middleware Error: " + err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = verifyChatAccess;
