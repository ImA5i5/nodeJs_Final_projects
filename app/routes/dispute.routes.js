// app/routes/dispute.routes.js
const express = require("express");
const router = express.Router();
const DisputeController = require("../controllers/DisputeController");
const Auth = require("../middleware/auth.middleware");
const Role = require("../middleware/role.middleware");
const Dispute = require("../models/Dispute");


// ✅ Client raises dispute
router.post(
  "/raise",
  Auth.verifyAccessToken,
  Role.authorizeRoles("client"),
  DisputeController.raise
);

// ✅ Admin — List disputes
router.get(
  "/",
  Auth.verifyAccessToken,
  Role.authorizeRoles("admin"),
  DisputeController.list
);

// ✅ Admin — Resolve dispute
router.post(
  "/resolve",
  Auth.verifyAccessToken,
  Role.authorizeRoles("admin"),
  DisputeController.resolve
);

// ✅ Admin get dispute details
router.get(
  "/:id",
  Auth.verifyAccessToken,
  Role.authorizeRoles("admin"),
  async (req, res) => {
    try {
      const dispute = await Dispute.findById(req.params.id)
        .populate("milestone")
        .populate("raisedBy");

      if (!dispute)
        return res.json({ success: false, message: "Dispute not found" });

      res.json({ success: true, dispute });

    } catch (err) {
      res.json({ success: false, message: err.message });
    }
  }
);


module.exports = router;
