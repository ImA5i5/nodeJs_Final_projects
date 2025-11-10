

// app/controllers/NotificationController.js
const Notification = require("../models/Notification");
const NotificationService = require("../services/NotificationService");
const winston = require("../config/winston");

class NotificationController {
  /* -----------------------------------------------------
     ✅ 1. GET ALL NOTIFICATIONS (LIST PAGE)
  ------------------------------------------------------*/
  static async getAll(req, res) {
    try {
      const notifications = await Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .lean();

      return res.render("pages/chat/notifications", {
        layout: req.user.role === "client"
          ? "layouts/client-layout"
          : "layouts/freelancer-layout",
        notifications,
        user: req.user
      });

    } catch (err) {
      winston.error("Get Notifications Error: " + err.message);
      return res.status(500).send("Failed to load notifications");
    }
  }


  /* -----------------------------------------------------
     ✅ 2. MARK ONE AS READ
  ------------------------------------------------------*/
   
  static async markRead(req, res) {
  try {

    console.log("Mark read:", req.params.id);
    console.log("User:", req.user._id);

    console.log("CHECK DB → ID:", req.params.id);
const check = await Notification.findById(req.params.id).lean();
console.log("CHECK RESULT →", check);


    if (!notif) {
      return res.status(404).json({
        success: false,
        message: "Notification not found OR does not belong to user"
      });
    }

    return res.json({ success: true, message: "Marked as read" });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
}




  /* -----------------------------------------------------
     ✅ 3. MARK ALL AS READ
  ------------------------------------------------------*/
  static async markAllRead(req, res) {
    try {
      await Notification.updateMany(
        { user: req.user._id, isRead: false },
        { $set: { isRead: true } }
      );

      return res.json({
        success: true,
        message: "All notifications marked as read"
      });
    } catch (err) {
      winston.error("Mark All Read Error: " + err.message);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }



  /* -----------------------------------------------------
     ✅ 4. DELETE ONE NOTIFICATION
  ------------------------------------------------------*/
  
  static async deleteOne(req, res) {
    try {
      const notif = await Notification.findOneAndDelete({
        _id: req.params.id,
        user: req.user._id
      });

      if (!notif) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }

      res.json({ success: true, message: "Deleted successfully" });

    } catch (err) {
      winston.error("Delete One Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }




  /* -----------------------------------------------------
     ✅ 5. DELETE ALL NOTIFICATIONS
  ------------------------------------------------------*/
  static async deleteAll(req, res) {
    try {
      await Notification.deleteMany({ user: req.user._id });

      return res.json({
        success: true,
        message: "All notifications deleted"
      });

    } catch (err) {
      winston.error("Delete All Notifications Error: " + err.message);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

}

module.exports = NotificationController;
