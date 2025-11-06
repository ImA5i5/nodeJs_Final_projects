// app/middleware/upload.middleware.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "freelancer_marketplace/uploads",
    allowed_formats: ["jpg", "jpeg", "png", "pdf", "docx"],
    public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
  }),
});

const upload = multer({ storage });

/**
 * ✅ Supports:
 *  - single(field)
 *  - multiple(field, maxCount)
 *  - profileUpload() => handles profilePic + portfolio
 */
class UploadMiddleware {
  static single(fieldName) {
    return upload.single(fieldName);
  }

  static multiple(fieldName, maxCount = 5) {
    return upload.array(fieldName, maxCount);
  }

  static profileUpload() {
    return upload.fields([
      { name: "profilePic", maxCount: 1 },
      { name: "portfolio", maxCount: 10 },
    ]);
  }
}

module.exports = UploadMiddleware;
