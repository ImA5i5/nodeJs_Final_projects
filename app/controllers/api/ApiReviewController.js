// app/controllers/api/ApiReviewController.js
const Review = require("../../models/Review");
const Project = require("../../models/Project");
const User = require("../../models/User");
const EmailService = require("../../services/email.service");
const winston = require("../../config/winston");

class ApiReviewController {
  /**
   * ✅ 1. CLIENT — Create Review after project completion
   * POST /api/review/:projectId
   * Body: { rating, feedback, tags }
   */
  static async createReview(req, res) {
    try {
      const clientId = req.user._id;
      const { projectId } = req.params;
      const { rating, feedback, tags } = req.body;

      // ✅ Find project
      const project = await Project.findById(projectId).populate("hiredFreelancer", "email fullName role");

      if (!project) return res.status(404).json({ message: "Project not found" });
      if (project.client.toString() !== clientId.toString())
        return res.status(403).json({ message: "Unauthorized" });
      if (project.status !== "completed")
        return res.status(400).json({ message: "Project must be completed to leave a review" });
      if (!project.hiredFreelancer)
        return res.status(400).json({ message: "No freelancer hired for this project" });
      const existingReview = await Review.findOne({ project: project._id, client: clientId });
if (existingReview) {
  existingReview.rating = rating;
  existingReview.feedback = feedback;
  existingReview.tags = tags;
  await existingReview.save();
  return res.json({ message: "Review updated successfully", review: existingReview });
}


      // ✅ Create review
      const review = await Review.create({
        project: project._id,
        client: clientId,
        freelancer: project.hiredFreelancer._id,
        rating,
        feedback,
        tags,
      });

      // ✅ Mark project as reviewed
      project.reviewed = true;
      await project.save();

      // ✅ Update freelancer profile rating
      const freelancer = await User.findById(project.hiredFreelancer._id);
      const reviews = await Review.find({ freelancer: freelancer._id, removed: false });

      const avgRating = reviews.length
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : rating;

      freelancer.profile.rating = avgRating.toFixed(1);
      freelancer.profile.totalReviews = reviews.length;
      await freelancer.save();

      // ✅ Notify freelancer
      await EmailService.sendNotification(
        freelancer.email,
        "✅ New Review Received",
        `<p>You received a new review for <b>${project.title}</b>.</p>
         <p>Rating: ⭐ ${rating}</p>
         <p>Feedback: "${feedback}"</p>`
      );

      return res.status(201).json({
        message: "Review submitted successfully",
        review,
      });
    } catch (err) {
      winston.error("Create Review Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ 2. FREELANCER — Reply to a Review
   * PATCH /api/review/:reviewId/reply
   * Body: { reply }
   */
  static async replyToReview(req, res) {
    try {
      const freelancerId = req.user._id;
      const { reviewId } = req.params;
      const { reply } = req.body;

      const review = await Review.findById(reviewId);
      if (!review) return res.status(404).json({ message: "Review not found" });
      if (review.freelancer.toString() !== freelancerId.toString())
        return res.status(403).json({ message: "Unauthorized" });
      if (review.reply)
        return res.status(400).json({ message: "Reply already submitted" });

      review.reply = reply;
      review.repliedAt = new Date();
      await review.save();

      return res.json({ message: "Reply added successfully", review });
    } catch (err) {
      winston.error("Reply to Review Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ 3. ADMIN — Moderate a Review (Remove abusive ones)
   * PATCH /api/review/:reviewId/moderate
   * Body: { action: "remove" | "restore" }
   */
  static async moderateReview(req, res) {
    try {
      const { reviewId } = req.params;
      const { action } = req.body;

      const review = await Review.findById(reviewId);
      if (!review) return res.status(404).json({ message: "Review not found" });

      if (action === "remove") review.removed = true;
      else if (action === "restore") review.removed = false;
      else return res.status(400).json({ message: "Invalid action" });

      await review.save();

      return res.json({ message: `Review ${action}d successfully`, review });
    } catch (err) {
      winston.error("Moderate Review Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ 4. CLIENT/FREELANCER — View All Reviews for Freelancer
   * GET /api/review/freelancer/:freelancerId
   */
  static async getFreelancerReviews(req, res) {
    try {
      const { freelancerId } = req.params;

      const reviews = await Review.find({ freelancer: freelancerId, removed: false })
        .populate("client", "fullName email")
        .populate("project", "title");

      return res.json({ total: reviews.length, reviews });
    } catch (err) {
      winston.error("Get Freelancer Reviews Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }

  /**
   * ✅ 5. CLIENT — View Own Reviews Given
   * GET /api/review/my
   */
  static async getMyReviews(req, res) {
    try {
      const clientId = req.user._id;
      const reviews = await Review.find({ client: clientId })
        .populate("freelancer", "fullName email profile.rating")
        .populate("project", "title status");

      return res.json({ total: reviews.length, reviews });
    } catch (err) {
      winston.error("Get My Reviews Error: " + err.message);
      return res.status(500).json({ message: "Server error" });
    }
  }
}

module.exports = ApiReviewController;
