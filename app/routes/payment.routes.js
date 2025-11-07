// app/routes/payment.routes.js
const router = require("express").Router();
const PaymentController = require("../controllers/PaymentController");
const RoleMiddleware = require("../middleware/role.middleware");
const AuthMiddleware = require("../middleware/auth.middleware");
router.use(AuthMiddleware.verifyAccessToken);

// ✅ Client: Create Razorpay order
router.post(
  "/create-order",
  RoleMiddleware.authorizeRoles("client"),
  PaymentController.createOrder
);

// ✅ Razorpay success verification
router.post(
  "/verify",
  RoleMiddleware.authorizeRoles("client"),
  PaymentController.verify
);

// ✅ Client: Release milestone payment → goes to freelancer wallet
router.post(
  "/release",
  RoleMiddleware.authorizeRoles("client"),
  PaymentController.release
);

module.exports = router;
