// app/utils/notify.js
const Notification = require("../models/Notification");

module.exports = {
  async sendNotification(io, userId, message, type = "system") {
    try {
      // Save in DB
      const notif = await Notification.create({
        user: userId,
        message,
        type,
      });

      // Real-time emit (Socket.IO)
      if (io) {
        io.to(userId.toString()).emit("notification", notif);
      }

      return notif;
    } catch (err) {
      console.error("🔴 Notification error:", err.message);
    }
  },
};
