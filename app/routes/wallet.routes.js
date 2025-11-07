// app/routes/wallet.routes.js
const router = require("express").Router();
const WalletController = require("../controllers/WalletController");
const RoleMiddleware = require("../middleware/role.middleware");
const AuthMiddleware = require("../middleware/auth.middleware");
router.use(AuthMiddleware.verifyAccessToken);

// ✅ Freelancer Earnings + Wallet Page
router.get(
  "/",
  RoleMiddleware.authorizeRoles("freelancer"),
  WalletController.getEarnings
);

router.post(
  "/request-withdraw",
  RoleMiddleware.authorizeRoles("freelancer"),
  WalletController.requestWithdraw
);

module.exports = router;
