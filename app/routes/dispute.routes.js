// app/routes/dispute.routes.js
const router = require("express").Router();

const DisputeController = require("../controllers/DisputeController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");

// ✅ Only logged in users can raise disputes
router.use(AuthMiddleware.verifyAccessToken);

// ✅ CLIENT: Raise dispute
router.post(
  "/raise",
  RoleMiddleware.authorizeRoles("client"),
  DisputeController.raise
);

// ✅ ADMIN: List disputes
router.get(
  "/",
  RoleMiddleware.authorizeRoles("admin"),
  DisputeController.list
);

// ✅ ADMIN: Resolve dispute
router.put(
  "/resolve",
  RoleMiddleware.authorizeRoles("admin"),
  DisputeController.resolve
);

module.exports = router;
