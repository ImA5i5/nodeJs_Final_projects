// app/utils/helper.js
const crypto = require("crypto");

class Helper {
  // Generate 6-digit OTP
  static generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Random alphanumeric string
  static generateRandomString(length = 12) {
    return crypto.randomBytes(length).toString("hex").slice(0, length);
  }

  // Pagination parameters
  static getPagination(query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }

  // Format date to DD-MM-YYYY
  static formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Calculate average rating
  static calculateAverageRating(reviews) {
    if (!reviews || reviews.length === 0) return 0;
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return (total / reviews.length).toFixed(1);
  }
}

module.exports = Helper;
