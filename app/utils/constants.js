// app/utils/constants.js

const USER_ROLES = {
  ADMIN: "admin",
  FREELANCER: "freelancer",
  CLIENT: "client",
};

const PROJECT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  DISPUTED: "disputed",
};

const PAYMENT_STATUS = {
  PENDING: "pending",
  ESCROW: "in-escrow",
  RELEASED: "released",
  REFUNDED: "refunded",
};

const RESPONSE_MESSAGES = {
  SUCCESS: "Operation successful",
  FAILED: "Something went wrong",
  UNAUTHORIZED: "Unauthorized access",
  VALIDATION_ERROR: "Validation failed",
  NOT_FOUND: "Data not found",
  LOGIN_REQUIRED: "Please log in to continue",
};

const OTP_EXPIRY_MINUTES = 10;

module.exports = {
  USER_ROLES,
  PROJECT_STATUS,
  PAYMENT_STATUS,
  RESPONSE_MESSAGES,
  OTP_EXPIRY_MINUTES,
};
