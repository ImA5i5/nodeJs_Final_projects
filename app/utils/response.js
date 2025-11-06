// app/utils/response.js

class ApiResponse {
  static success(res, message = "Success", data = {}, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res, message = "Error occurred", statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  static validationError(res, errors) {
    return this.error(res, "Validation failed", 422, errors);
  }

  static unauthorized(res, message = "Unauthorized") {
    return this.error(res, message, 401);
  }
}

module.exports = ApiResponse;
