const router = require("express").Router();
const PaymentController = require("../controllers/PaymentController");
const Role = require("../middleware/role.middleware");
const AuthMiddleware = require("../middleware/auth.middleware");
router.use(AuthMiddleware.verifyAccessToken);

// ✅ Create Razorpay order
router.post(
  "/create-order",
  Role.authorizeRoles("client"),
  PaymentController.createOrder
);

// ✅ Verify Razorpay signature
router.post(
  "/verify",
  Role.authorizeRoles("client"),
  PaymentController.verify
);

// ✅ Release payment (old style, request body)
router.post(
  "/release",
  Role.authorizeRoles("client"),
  PaymentController.release
);

// ✅ Release payment by milestone id (recommended)
router.put(
  "/milestone/:id/release",
  Role.authorizeRoles("client"),
  PaymentController.releaseMilestone
);


module.exports = router;
