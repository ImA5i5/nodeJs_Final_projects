// app/controllers/api/ApiCategoryController.js

const Category = require("../../models/Category");
const winston = require("../../config/winston");

class ApiCategoryController {
  /**
   * ✅ 1. Get All Categories (with subcategories)
   */
  static async getAll(req, res) {
    try {
      const categories = await Category.find().sort({ createdAt: -1 });
      return res.json({
        message: "Categories fetched successfully",
        categories,
      });
    } catch (err) {
      winston.error("GetAll Categories Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ 2. Add Category
   */
  static async addCategory(req, res) {
    try {
      const { name, description } = req.body;

      if (!name)
        return res.status(400).json({ message: "Category name is required" });

      const exists = await Category.findOne({ name });
      if (exists)
        return res
          .status(400)
          .json({ message: "Category already exists with this name" });

      const category = await Category.create({
        name,
        description,
        createdBy: req.user._id,
        isApproved: true, // admins are allowed to auto-approve
      });

      return res.status(201).json({
        message: "Category created successfully",
        category,
      });
    } catch (err) {
      winston.error("Add Category Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ 3. Edit Category
   */
  static async editCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const updates = req.body;

      const category = await Category.findByIdAndUpdate(
        categoryId,
        updates,
        { new: true }
      );

      if (!category)
        return res.status(404).json({ message: "Category not found" });

      return res.json({
        message: "Category updated successfully",
        category,
      });
    } catch (err) {
      winston.error("Edit Category Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ 4. Change Category Status (Approve / Disable)
   */
  static async toggleCategoryStatus(req, res) {
    try {
      const { categoryId } = req.params;

      const category = await Category.findById(categoryId);
      if (!category)
        return res.status(404).json({ message: "Category not found" });

      category.isApproved = !category.isApproved;
      await category.save();

      return res.json({
        message: category.isApproved
          ? "Category activated"
          : "Category deactivated",
        category,
      });
    } catch (err) {
      winston.error("Toggle Category Status Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ 5. Delete Category (Soft Delete - archive)
   */
  static async deleteCategory(req, res) {
    try {
      const { categoryId } = req.params;

      const category = await Category.findById(categoryId);

      if (!category)
        return res.status(404).json({ message: "Category not found" });

      await category.deleteOne();

      return res.json({
        message: "Category deleted successfully",
        category,
      });
    } catch (err) {
      winston.error("Delete Category Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // -------------------------------------------------------------------
  // ✅ SUBCATEGORY MANAGEMENT
  // -------------------------------------------------------------------

  /**
   * ✅ 6. Add Subcategory
   */
  static async addSubcategory(req, res) {
    try {
        
      const { categoryId } = req.params;
      const { name } = req.body;

      if (!name)
        return res
          .status(400)
          .json({ message: "Subcategory name is required" });

      const category = await Category.findById(categoryId);

      if (!category)
        return res.status(404).json({ message: "Category not found" });

      // Check if subcategory name already exists
      const exists = category.subcategories.find(
        (sc) => sc.name.toLowerCase() === name.toLowerCase()
      );
      if (exists)
        return res
          .status(400)
          .json({ message: "Subcategory already exists" });

      category.subcategories.push({
        name,
        isApproved: true,
        createdBy: req.user._id,
      });

      await category.save();

      return res.status(201).json({
        message: "Subcategory added successfully",
        category,
      });
    } catch (err) {
      winston.error("Add Subcategory Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ 7. Edit Subcategory
   */
  static async editSubcategory(req, res) {
    try {
        
      const { categoryId, subcategoryId } = req.params;
      const updates = req.body;
      console.log("✅ addSubcategory hit successfully");

      const category = await Category.findById(categoryId);

      if (!category)
        return res.status(404).json({ message: "Category not found" });

      const subcategory = category.subcategories.id(subcategoryId);

      if (!subcategory)
        return res.status(404).json({ message: "Subcategory not found" });

      Object.assign(subcategory, updates);

      await category.save();

      return res.json({
        message: "Subcategory updated successfully",
        category,
      });
    } catch (err) {
      winston.error("Edit Subcategory Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ 8. Delete Subcategory
   */
  static async deleteSubcategory(req, res) {
    try {
      const { categoryId, subcategoryId } = req.params;

      const category = await Category.findById(categoryId);
      if (!category)
        return res.status(404).json({ message: "Category not found" });

      const subcategory = category.subcategories.id(subcategoryId);
      if (!subcategory)
        return res.status(404).json({ message: "Subcategory not found" });

      subcategory.deleteOne();
      await category.save();

      return res.json({
        message: "Subcategory deleted successfully",
        category,
      });
    } catch (err) {
      winston.error("Delete Subcategory Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = ApiCategoryController;
