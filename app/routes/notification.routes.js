// app/routes/notification.routes.js
const express = require("express");
const router = express.Router();

const NotificationController = require("../controllers/NotificationController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");

// ✅ must be logged in
router.use(AuthMiddleware.verifyAccessToken);

// ✅ CLIENT + FREELANCER both allowed
router.get(
  "/",
  RoleMiddleware.authorizeRoles("client", "freelancer"),
  NotificationController.getAll
);

// ✅ Mark ONE as read
router.put("/:id/read",RoleMiddleware.authorizeRoles("client", "freelancer"), NotificationController.markRead);

router.put(
  "/read-all",
  RoleMiddleware.authorizeRoles("client", "freelancer"),
  NotificationController.markAllRead
);

// ✅ Delete ONE
router.delete("/:id", RoleMiddleware.authorizeRoles("client", "freelancer"), NotificationController.deleteOne);

router.delete(
  "/",
  RoleMiddleware.authorizeRoles("client", "freelancer"),
  NotificationController.deleteAll
);

module.exports = router;
