// app/controllers/ReviewController.js
const Review = require("../models/Review");
const Project = require("../models/Project");
const winston = require("../config/winston");

class ReviewController {
  /* --------------------------------------------------------------------
     🌟 FREELANCER SIDE REVIEW MODULE
     (View and respond to client reviews)
  -------------------------------------------------------------------- */

  /**
   * 🧾 View reviews received by freelancer
   */
  static async getFreelancerReviews(req, res, next) {
    try {
      const freelancerId = req.user._id;

      const reviews = await Review.find({ freelancer: freelancerId })
        .populate("client project", "fullName title")
        .sort({ createdAt: -1 })
        .lean();

      const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      const averageRating = reviews.length ? (totalRating / reviews.length).toFixed(1) : 0;

      res.render("pages/freelancer/reviews", {
        layout: "layouts/freelancer-layout",
        title: "My Reviews",
        reviews,
        averageRating,
      });
    } catch (err) {
      winston.error("Get Freelancer Reviews Error: " + err.message);
      next(err);
    }
  }

  /**
   * 💬 Respond to a client review (AJAX)
   */
  static async respondToReview(req, res) {
    try {
      const { reviewId, response } = req.body;
      const review = await Review.findById(reviewId);

      if (!review || review.freelancer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Unauthorized action." });
      }

      review.freelancerResponse = response;
      await review.save();

      res.json({ success: true, message: "Response submitted successfully!" });
    } catch (err) {
      winston.error("Respond To Review Error: " + err.message);
      res.status(500).json({ success: false, message: "Server error responding to review" });
    }
  }

  /**
   * 🔄 Refresh reviews dynamically (AJAX)
   */
  static async getReviewsAjax(req, res) {
    try {
      const freelancerId = req.user._id;
      const reviews = await Review.find({ freelancer: freelancerId })
        .populate("client project", "fullName title")
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, reviews });
    } catch (err) {
      winston.error("Freelancer AJAX Reviews Error: " + err.message);
      res.status(500).json({ success: false, message: "Error fetching reviews" });
    }
  }

  /* --------------------------------------------------------------------
     💬 CLIENT SIDE REVIEW MODULE
     (Leave and view reviews for freelancers)
  -------------------------------------------------------------------- */

  /**
   * 📝 Render review form for completed project
   */
  static async reviewForm(req, res, next) {
    try {
      const projectId = req.params.projectId;
      const project = await Project.findById(projectId)
        .populate("hiredFreelancer", "fullName profile.profilePic")
        .lean();

      if (!project) {
        return res.status(404).render("errors/404", {
          layout: "layouts/client-layout",
          title: "Project Not Found",
        });
      }

      res.render("pages/client/review-form", {
        layout: "layouts/client-layout",
        title: "Leave a Review",
        project,
      });
    } catch (err) {
      winston.error("Render Review Form Error: " + err.message);
      next(err);
    }
  }

  /**
   * 🌟 Submit new review (AJAX or normal)
   */
  static async submitReview(req, res) {
    try {
      const { projectId, rating, comment } = req.body;
      const clientId = req.user._id;

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" });
      }

      if (!project.hiredFreelancer) {
        return res.status(400).json({ success: false, message: "No freelancer assigned to this project" });
      }

      // Prevent duplicate reviews
      const existingReview = await Review.findOne({ project: projectId, client: clientId });
      if (existingReview) {
        return res.status(400).json({ success: false, message: "You already reviewed this freelancer" });
      }

      await Review.create({
        project: projectId,
        client: clientId,
        freelancer: project.hiredFreelancer,
        rating: Number(rating),
        comment,
      });

      res.json({ success: true, message: "Thank you! Your review was submitted successfully." });
    } catch (err) {
      winston.error("Submit Review Error: " + err.message);
      res.status(500).json({ success: false, message: "Error submitting review" });
    }
  }

  /**
   * 👀 View all reviews created by the client
   */
  static async getClientReviews(req, res, next) {
    try {
      const clientId = req.user._id;

      const reviews = await Review.find({ client: clientId })
        .populate("freelancer project", "fullName title")
        .sort({ createdAt: -1 })
        .lean();

      res.render("pages/client/reviews", {
        layout: "layouts/client-layout",
        title: "My Reviews",
        reviews,
      });
    } catch (err) {
      winston.error("Get Client Reviews Error: " + err.message);
      next(err);
    }
  }

  /**
   * 🔁 AJAX - Load client’s reviews dynamically
   */
  static async getClientReviewsAjax(req, res) {
    try {
      const clientId = req.user._id;

      const reviews = await Review.find({ client: clientId })
        .populate("freelancer project", "fullName title")
        .sort({ createdAt: -1 })
        .lean();

      res.json({ success: true, reviews });
    } catch (err) {
      winston.error("Client Reviews AJAX Error: " + err.message);
      res.status(500).json({ success: false, message: "Error loading client reviews" });
    }
  }
}

module.exports = ReviewController;
