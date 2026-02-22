const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  uploadResume,
  uploadCertificate,
  uploadPhoto,
  handleUploadError,
} = require("../middleware/uploadMiddleware");
const {
  uploadResume: handleResume,
  uploadCertificate: handleCertificate,
  uploadPhoto: handlePhoto,
  getMyFiles,
  deleteCertificate,
} = require("../controllers/uploadController");

const router = express.Router();

const auth = protect(["student", "alumni"]);

// Resume — single PDF/DOC
router.post(
  "/resume",
  auth,
  (req, res, next) => uploadResume.single("resume")(req, res, (err) => handleUploadError(err, req, res, next)),
  handleResume
);

// Certificate — single PDF/image
router.post(
  "/certificate",
  auth,
  (req, res, next) => uploadCertificate.single("certificate")(req, res, (err) => handleUploadError(err, req, res, next)),
  handleCertificate
);

// Profile photo
router.post(
  "/photo",
  auth,
  (req, res, next) => uploadPhoto.single("photo")(req, res, (err) => handleUploadError(err, req, res, next)),
  handlePhoto
);

// Get all my uploaded files with signed URLs
router.get("/my-files", auth, getMyFiles);

// Delete a certificate by key
router.delete("/certificate/:key", auth, deleteCertificate);

module.exports = router;
