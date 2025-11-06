// app/routes/category.routes.js
const express = require("express");
const router = express.Router();

const CategoryController = require("../controllers/CategoryController");
const AuthMiddleware = require("../middleware/auth.middleware");
const RoleMiddleware = require("../middleware/role.middleware");

router.use(AuthMiddleware.verifyAccessToken);
router.use(RoleMiddleware.authorizeRoles("admin"));

// View all categories
router.get("/", CategoryController.list);

// CRUD
router.post("/create", CategoryController.create);
router.post("/update/:id", CategoryController.update);
router.post("/delete/:id", CategoryController.delete);

// ✅ AJAX Subcategory routes
router.get("/:id/subcategories", CategoryController.getSubcategories);
router.post("/:id/subcategories", CategoryController.addSubcategoryAjax);
router.post("/:id/subcategories/approve/:subId", CategoryController.approveSubcategory);
router.post("/update/:id", CategoryController.update);
router.post("/:id/subcategories/update/:subId", CategoryController.updateSubcategory);
router.post("/:id/subcategories/delete/:subId", CategoryController.deleteSubcategory);

// ✅ Category approval
router.post("/approve/:id", CategoryController.approveCategory);
router.post("/not-approve/:id", CategoryController.notApproveCategory);


module.exports = router;
