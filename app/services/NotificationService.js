const Notification = require("../models/Notification");
const winston = require("../config/winston");

class NotificationService {
  static async send(userId, data) {
    try {
      const notif = await Notification.create({
        user: userId,
        title: data.title,
        message: data.message,
        type: data.type,
        icon: data.icon || "🔔",
        link: data.link || null,
      });

      // ✅ Emit real-time notification
      if (global.io) {
        global.io.to(userId.toString()).emit("notification", notif);
      }

      return notif;
    } catch (err) {
      winston.error("Notification Error: " + err.message);
    }
  }
}

module.exports = NotificationService;
