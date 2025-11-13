// app/routes/api/api.freelancer.routes.js

const express = require("express");
const router = express.Router();

const ApiFreelancerController = require("../../controllers/api/ApiFreelancerController");
const ApiAuth = require("../../middleware/apiAuth.middleware");
const ApiRole = require("../../middleware/apiRole.middleware");
const Upload = require("../../middleware/upload.middleware");

/**
 * @swagger
 * tags:
 *   name: Freelancer
 *   description: Freelancer Dashboard & Profile Management APIs
 */

// 🔐 Authentication + Freelancer Role Check
router.use(ApiAuth.verifyAccessToken);
router.use(ApiRole.allow("freelancer"));

/**
 * @swagger
 * /api/freelancer/dashboard:
 *   get:
 *     summary: Get freelancer dashboard statistics
 *     tags: [Freelancer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data returned successfully
 */
router.get("/dashboard", ApiFreelancerController.dashboard);

/**
 * @swagger
 * /api/freelancer/profile/create:
 *   post:
 *     summary: Create freelancer profile
 *     tags: [Freelancer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               bio:
 *                 type: string
 *               hourlyRate:
 *                 type: number
 *               experience:
 *                 type: number
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               profilePic:
 *                 type: string
 *                 format: binary
 *               portfolio:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Profile created successfully
 */
router.post(
  "/profile/create",
  Upload.profileUpload(),
  ApiFreelancerController.createProfile
);

/**
 * @swagger
 * /api/freelancer/profile:
 *   put:
 *     summary: Update freelancer profile
 *     tags: [Freelancer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio:
 *                 type: string
 *                 example: Professional full-stack web developer
 *               hourlyRate:
 *                 type: number
 *                 example: 30
 *               experience:
 *                 type: number
 *                 example: 5
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["React", "Node", "MongoDB"]
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put("/profile", ApiFreelancerController.updateProfile);

/**
 * @swagger
 * /api/freelancer/profile/media:
 *   post:
 *     summary: Upload freelancer profile picture or portfolio images
 *     tags: [Freelancer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePic:
 *                 type: string
 *                 format: binary
 *               portfolio:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Media uploaded successfully
 */
router.post(
  "/profile/media",
  Upload.profileUpload(),
  ApiFreelancerController.uploadMedia
);

/**
 * @swagger
 * /api/freelancer/skills:
 *   post:
 *     summary: Add a skill to freelancer profile
 *     tags: [Freelancer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [skill]
 *             properties:
 *               skill:
 *                 type: string
 *                 example: Vue.js
 *     responses:
 *       200:
 *         description: Skill added successfully
 */
router.post("/skills", ApiFreelancerController.addSkill);

/**
 * @swagger
 * /api/freelancer/certifications:
 *   post:
 *     summary: Add a certification to freelancer profile
 *     tags: [Freelancer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, issuer]
 *             properties:
 *               title:
 *                 type: string
 *                 example: AWS Certified Developer
 *               issuer:
 *                 type: string
 *                 example: Amazon Web Services
 *               year:
 *                 type: number
 *                 example: 2023
 *     responses:
 *       201:
 *         description: Certification added successfully
 */
router.post("/certifications", ApiFreelancerController.addCertification);

/**
 * @swagger
 * /api/freelancer/reviews:
 *   get:
 *     summary: Get all reviews for the logged-in freelancer
 *     tags: [Freelancer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of freelancer reviews
 */
router.get("/reviews", ApiFreelancerController.getReviews);

module.exports = router;
