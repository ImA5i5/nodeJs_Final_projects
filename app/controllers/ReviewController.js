const Review = require("../models/Review");
const Project = require("../models/Project");
const User = require("../models/User");
const winston = require("../config/winston");
const EmailService = require("../services/email.service");

class ReviewController {
  /* ---------------------------------------------------
    ✅ 1. Show review form (client)
  ----------------------------------------------------*/
  static async reviewPage(req, res) {
    try {
      const projectId = req.params.projectId;

      const project = await Project.findOne({
        _id: projectId,
        client: req.user._id,
        status: "completed",
      })
        .populate("hiredFreelancer", "fullName avatar")
        .lean();

      if (!project) return res.status(404).send("Project not completed or not found");

      const existing = await Review.findOne({ project: projectId });
      if (existing) return res.redirect(`/review/view/${projectId}`);

      return res.render("pages/client/leave-review", {
        layout: "layouts/client-layout",
        project,
      });
    } catch (err) {
      winston.error("Review Page Error:", err.message);
      res.status(500).send("Error");
    }
  }

  /* ---------------------------------------------------
    ✅ 2. Submit Client Review
  ----------------------------------------------------*/
  static async submit(req, res) {
    try {
      const { projectId, rating, feedback, tags } = req.body;

      const project = await Project.findOne({
        _id: projectId,
        client: req.user._id,
        status: "completed",
      });

      if (!project)
        return res.json({ success: false, message: "Project not eligible for review" });

      // ✅ Prevent duplicate review
      const exists = await Review.findOne({ project: projectId });
      if (exists)
        return res.json({ success: false, message: "Review already submitted" });

      const review = await Review.create({
        project: projectId,
        client: req.user._id,
        freelancer: project.hiredFreelancer,
        rating,
        feedback,
        tags: tags ? tags.split(",") : [],
      });

      // ✅ Update freelancer rating
      await ReviewController.updateFreelancerRating(project.hiredFreelancer);

      // ✅ Notify freelancer
      await EmailService.sendNotification(
        project.hiredFreelancer.email,
        "✅ You received a new review!",
        `<p>You received a new review on project <b>${project.title}</b>.</p>`
      );

      return res.json({ success: true, message: "Review submitted!", review });
    } catch (err) {
      winston.error("Submit Review Error: " + err.message);
      res.status(500).json({ success: false, message: "Error submitting review" });
    }
  }

  /* ---------------------------------------------------
    ✅ 3. Freelancer Reply
  ----------------------------------------------------*/
  static async reply(req, res) {
    try {
      const { reviewId, reply } = req.body;

      const review = await Review.findById(reviewId);
      if (!review) return res.json({ success: false, message: "Review not found" });

      if (review.freelancer.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: "Not allowed" });

      if (review.reply)
        return res.json({ success: false, message: "Reply already submitted" });

      review.reply = reply;
      review.repliedAt = new Date();
      await review.save();

      return res.json({ success: true, message: "Reply added", review });
    } catch (err) {
      winston.error("Reply Review Error:", err.message);
      res.status(500).json({ success: false, message: "Error submitting reply" });
    }
  }

  /* ---------------------------------------------------
    ✅ 4. Admin — Remove/Restore Review
  ----------------------------------------------------*/
  static async moderate(req, res) {
    try {
      const { reviewId, action } = req.body;

      const review = await Review.findById(reviewId);
      if (!review) return res.json({ success: false, message: "Review not found" });

      review.removed = action === "remove";
      await review.save();

      await ReviewController.updateFreelancerRating(review.freelancer);

      return res.json({ success: true, message: "Review updated" });
    } catch (err) {
      winston.error("Moderate Review Error:", err.message);
      res.status(500).json({ success: false, message: "Error" });
    }
  }

  /* ---------------------------------------------------
    ✅ 5. Recalculate Freelancer Rating
  ----------------------------------------------------*/
  static async updateFreelancerRating(freelancerId) {
    const reviews = await Review.find({ freelancer: freelancerId, removed: false });

    const avg =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0;

    await User.findByIdAndUpdate(freelancerId, {
      averageRating: avg.toFixed(2),
      reviewCount: reviews.length,
    });
  }

  /* ---------------------------------------------------
    ✅ 6. View Review (Client & Freelancer)
  ----------------------------------------------------*/
  static async view(req, res) {
    try {
      const projectId = req.params.projectId;

      const review = await Review.findOne({ project: projectId })
        .populate("client freelancer project")
        .lean();

      if (!review) return res.status(404).send("No review found");

      return res.render("pages/client/view-review", {
        layout: "layouts/client-layout",
        review,
      });
    } catch (err) {
      winston.error("View Review Error:", err.message);
      res.status(500).send("Error");
    }
  }

  static async clientReviewList(req, res) {
  try {
    const reviews = await Review.find({ client: req.user._id })
      .populate("freelancer project")
      .sort({ createdAt: -1 })
      .lean();

    return res.render("pages/client/reviews-list", {
      layout: "layouts/client-layout",
      reviews,
    });
  } catch (err) {
    winston.error("Client Review List Error: " + err.message);
    res.status(500).send("Error loading reviews");
  }
}

}

module.exports = ReviewController;
