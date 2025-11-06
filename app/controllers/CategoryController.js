// app/controllers/CategoryController.js
const Category = require("../models/Category");
const winston = require("../config/winston");

class CategoryController {
  /** 📋 List Categories */
  static async list(req, res, next) {
    try {
      const categories = await Category.find().sort({ createdAt: -1 }).lean();

      res.render("pages/admin/categories", {
        layout: "layouts/admin-layout",
        title: "Category Management",
        categories,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    } catch (err) {
      next(err);
    }
  }

  /** ➕ Create Category */
  static async create(req, res, next) {
    try {
      const { name, description } = req.body;
      const exists = await Category.findOne({ name });

      if (exists) {
        req.flash("error", "Category already exists.");
        return res.redirect("/admin/categories");
      }

      await Category.create({
        name,
        description,
        isApproved: true,
        createdBy: req.user._id,
      });

      req.flash("success", `Category "${name}" created successfully.`);
      res.redirect("/admin/categories");
    } catch (err) {
      next(err);
    }
  }

  /** ✅ Approve Category */
  static async approveCategory(req, res, next) {
    try {
      const category = await Category.findById(req.params.id);
      if (!category)
        return res.status(404).json({ success: false, message: "Category not found" });

      category.isApproved = true;
      await category.save();

      return res.json({ success: true, message: `Category "${category.name}" approved.` });
    } catch (err) {
      next(err);
    }
  }

  /** 🗂 Get Subcategories */
  static async getSubcategories(req, res, next) {
    try {
      const category = await Category.findById(req.params.id).lean();
      if (!category)
        return res.status(404).json({ success: false, message: "Category not found" });

      return res.json({ success: true, subcategories: category.subcategories });
    } catch (err) {
      next(err);
    }
  }

  /** ➕ Add Subcategory (AJAX) */
  static async addSubcategoryAjax(req, res, next) {
    try {
      const { name } = req.body;
      if (!name)
        return res
          .status(400)
          .json({ success: false, message: "Subcategory name is required" });

      const category = await Category.findById(req.params.id);
      if (!category)
        return res.status(404).json({ success: false, message: "Category not found" });

      category.subcategories.push({
        name,
        isApproved: true,
        createdBy: req.user._id,
      });

      await category.save();
      return res.json({ success: true, message: `Subcategory "${name}" added.` });
    } catch (err) {
      next(err);
    }
  }

  /** ✅ Approve Subcategory */
  static async approveSubcategory(req, res, next) {
    try {
      const { id, subId } = req.params;
      const category = await Category.findById(id);
      if (!category)
        return res.status(404).json({ success: false, message: "Category not found" });

      const subcat = category.subcategories.id(subId);
      if (!subcat)
        return res.status(404).json({ success: false, message: "Subcategory not found" });

      subcat.isApproved = true;
      await category.save();

      return res.json({ success: true, message: `Subcategory "${subcat.name}" approved.` });
    } catch (err) {
      next(err);
    }
  }

  /** ❌ Delete Subcategory */
  static async deleteSubcategory(req, res, next) {
    try {
      const { id, subId } = req.params;
      const category = await Category.findById(id);
      if (!category)
        return res.status(404).json({ success: false, message: "Category not found" });

      const subcat = category.subcategories.id(subId);
      if (!subcat)
        return res.status(404).json({ success: false, message: "Subcategory not found" });

      subcat.deleteOne();
      await category.save();

      return res.json({ success: true, message: `Subcategory "${subcat.name}" deleted.` });
    } catch (err) {
      next(err);
    }
  }

  /** ❌ Delete Category */
  static async delete(req, res, next) {
    try {
      const category = await Category.findByIdAndDelete(req.params.id);
      if (!category) {
        req.flash("error", "Category not found.");
        return res.redirect("/admin/categories");
      }

      req.flash("success", `Category "${category.name}" deleted.`);
      res.redirect("/admin/categories");
    } catch (err) {
      next(err);
    }
  }

  /** ✏️ Update Subcategory */
static async updateSubcategory(req, res, next) {
  try {
    const { id, subId } = req.params;
    const { name } = req.body;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    const sub = category.subcategories.id(subId);
    if (!sub) return res.status(404).json({ success: false, message: "Subcategory not found" });

    sub.name = name;
    await category.save();

    res.json({ success: true, message: `Subcategory updated to "${name}".` });
  } catch (err) {
    next(err);
  }
}

/** ✏️ Update Category (AJAX) */
static async update(req, res, next) {
  try {
    const { name } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true }
    );

    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ success: true, message: `Category renamed to "${name}".` });
  } catch (err) {
    next(err);
  }
}

/** ❌ Revoke Category Approval */
static async notApproveCategory(req, res, next) {
  try {
    const category = await Category.findById(req.params.id);
    if (!category)
      return res.status(404).json({ success: false, message: "Category not found" });

    category.isApproved = false;
    await category.save();

    res.json({ success: true, message: `Category "${category.name}" is now not approved.` });
  } catch (err) {
    next(err);
  }
}

  /** 📝 Update Category */
  static async update(req, res, next) {
    try {
      const { name, description } = req.body;
      const category = await Category.findByIdAndUpdate(
        req.params.id,
        { name, description },
        { new: true }
      );

      if (!category) {
        req.flash("error", "Category not found.");
        return res.redirect("/admin/categories");
      }

      req.flash("success", `Category "${category.name}" updated.`);
      res.redirect("/admin/categories");
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CategoryController;
