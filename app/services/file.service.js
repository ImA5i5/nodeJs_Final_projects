// app/services/file.service.js
const cloudinary = require("../config/cloudinary");
const winston = require("../config/winston");

class FileService {
  static async uploadFile(filePath, folder = "freelancer_marketplace") {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: "auto",
      });
      return result.secure_url;
    } catch (err) {
      winston.error("Cloudinary upload error: " + err.message);
      throw new Error("File upload failed.");
    }
  }

  static async deleteFile(publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      winston.info(`Deleted file: ${publicId}`);
    } catch (err) {
      winston.error("Cloudinary delete error: " + err.message);
    }
  }
}

module.exports = FileService;
