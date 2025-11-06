// app/controllers/ClientController.js
const Project = require("../models/Project");
const Payment = require("../models/Payment");
const Review = require("../models/Review");

class ClientController {
  static async dashboard(req, res, next) {
    try {
      const clientId = req.user._id;

      // 🧾 Client Projects
      const projects = await Project.find({ client: clientId });
      const totalProjects = projects.length;
      const activeProjects = projects.filter(p => ["approved", "in-progress"].includes(p.status)).length;
      const completedProjects = projects.filter(p => p.status === "completed").length;

      // 💰 Total Spent (Released Payments)
      const totalSpentAgg = await Payment.aggregate([
        { $match: { client: clientId, status: "released" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const totalSpent = totalSpentAgg[0]?.total || 0;

      // ⭐ Average Rating Given (from Review model)
      const avgRatingAgg = await Review.aggregate([
        { $match: { client: clientId } },
        { $group: { _id: null, avg: { $avg: "$rating" } } },
      ]);
      const avgRating = avgRatingAgg[0]?.avg?.toFixed(1) || 0;

      // 🖥️ Render Dashboard
      res.render("pages/client/dashboard", {
        layout: "layouts/client-layout",
        title: "Client Dashboard",
        projects,
        totalProjects,
        activeProjects,
        completedProjects,
        totalSpent,
        avgRating, // ✅ Pass to EJS
      });
    } catch (err) {
      next(err);
    }
  }



  static async createProject(req, res, next) {
    try {
      const data = req.body;
      if (req.file) data.attachments = [req.file.path];
      data.client = req.user._id;

      await Project.create(data);
      req.flash("success", "Project created successfully!");
      res.redirect("/client/projects");
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ClientController;
