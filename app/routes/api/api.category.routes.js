// app/routes/api/api.category.routes.js

const express = require("express");
const router = express.Router();

const ApiCategoryController = require("../../controllers/api/ApiCategoryController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");

// ✅ All category routes must be admin-only
router.use(ApiAuth.verifyAccessToken);
router.use(ApiRole.allow("admin"));

// ✅ CATEGORY ROUTES
router.get("/", ApiCategoryController.getAll);
router.post("/", ApiCategoryController.addCategory);
router.put("/:categoryId", ApiCategoryController.editCategory);
router.patch("/:categoryId/status", ApiCategoryController.toggleCategoryStatus);
router.delete("/:categoryId", ApiCategoryController.deleteCategory);

// ✅ SUBCATEGORY ROUTES
router.post("/:categoryId/subcategory", ApiCategoryController.addSubcategory);
router.put(
  "/:categoryId/subcategory/:subcategoryId",
  (req, res, next) => {
    console.log("✅ ROUTE MATCHED for editSubcategory");
    next();
  },
  ApiCategoryController.editSubcategory
);

router.delete(
  "/:categoryId/subcategory/:subcategoryId",
  ApiCategoryController.deleteSubcategory
);

module.exports = router;
