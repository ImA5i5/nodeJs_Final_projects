// app/utils/validation.js
const Joi = require("joi");

class Validation {
  // Auth Validation
  static registerSchema = Joi.object({
    fullName: Joi.string().min(3).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid("admin", "freelancer", "client").required(),
  });

  static loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  static otpSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required(),
  });

  // Project Validation
  static projectSchema = Joi.object({
    title: Joi.string().min(5).required(),
    description: Joi.string().min(20).required(),
    category: Joi.string().required(),
    budget: Joi.number().positive().required(),
    duration: Joi.string().required(),
    paymentType: Joi.string().valid("fixed", "hourly").required(),
  });

  // Bid Validation
  static bidSchema = Joi.object({
    projectId: Joi.string().required(),
    bidAmount: Joi.number().positive().required(),
    deliveryTime: Joi.string().required(),
    coverLetter: Joi.string().min(10).required(),
  });

  static validate(schema, data) {
    const { error } = schema.validate(data, { abortEarly: false });
    if (error) {
      return error.details.map((err) => err.message);
    }
    return null;
  }
}

module.exports = Validation;
