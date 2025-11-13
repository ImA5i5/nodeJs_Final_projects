// app/routes/api/api.category.routes.js

const express = require("express");
const router = express.Router();

const ApiCategoryController = require("../../controllers/api/ApiCategoryController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Admin-only Category & Subcategory Management APIs
 */

// ---------------------------------------------------------
// 🔐 Admin Authentication & Role Protection
// ---------------------------------------------------------
router.use(ApiAuth.verifyAccessToken);
router.use(ApiRole.allow("admin"));

/**
 * @swagger
 * /api/category:
 *   get:
 *     summary: Get all categories with subcategories
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all categories
 */
router.get("/", ApiCategoryController.getAll);

/**
 * @swagger
 * /api/category:
 *   post:
 *     summary: Create a new category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Web Development
 *               description:
 *                 type: string
 *                 example: All web-related development services
 *     responses:
 *       201:
 *         description: Category created successfully
 */
router.post("/", ApiCategoryController.addCategory);

/**
 * @swagger
 * /api/category/{categoryId}:
 *   put:
 *     summary: Edit an existing category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         example: 67123bdde12c9bff2c1a1123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: UI/UX Design
 *               description:
 *                 type: string
 *                 example: Design-related services
 *     responses:
 *       200:
 *         description: Category updated successfully
 */
router.put("/:categoryId", ApiCategoryController.editCategory);

/**
 * @swagger
 * /api/category/{categoryId}/status:
 *   patch:
 *     summary: Toggle category active/inactive status
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         example: 67123bdde12c9bff2c1a1123
 *     responses:
 *       200:
 *         description: Category status updated
 */
router.patch("/:categoryId/status", ApiCategoryController.toggleCategoryStatus);

/**
 * @swagger
 * /api/category/{categoryId}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         example: 67123bdde12c9bff2c1a1123
 *     responses:
 *       200:
 *         description: Category deleted successfully
 */
router.delete("/:categoryId", ApiCategoryController.deleteCategory);

/* ---------------------------------------------------------
   📌 SUBCATEGORY ROUTES
----------------------------------------------------------*/

/**
 * @swagger
 * /api/category/{categoryId}/subcategory:
 *   post:
 *     summary: Add a new subcategory to a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *         example: 67123bdde12c9bff2c1a1123
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: ReactJS Developer
 *     responses:
 *       201:
 *         description: Subcategory added successfully
 */
router.post("/:categoryId/subcategory", ApiCategoryController.addSubcategory);

/**
 * @swagger
 * /api/category/{categoryId}/subcategory/{subcategoryId}:
 *   put:
 *     summary: Edit an existing subcategory
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: subcategoryId
 *         required: true
 *         schema:
 *           type: string
 *         example: 67123c112abfe9bb7c312332
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Next.js Developer
 *     responses:
 *       200:
 *         description: Subcategory updated successfully
 */
router.put(
  "/:categoryId/subcategory/:subcategoryId",
  ApiCategoryController.editSubcategory
);

/**
 * @swagger
 * /api/category/{categoryId}/subcategory/{subcategoryId}:
 *   delete:
 *     summary: Delete a subcategory
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: subcategoryId
 *         required: true
 *         schema:
 *           type: string
 *         example: 67123c112abfe9bb7c312332
 *     responses:
 *       200:
 *         description: Subcategory deleted successfully
 */
router.delete(
  "/:categoryId/subcategory/:subcategoryId",
  ApiCategoryController.deleteSubcategory
);

module.exports = router;
