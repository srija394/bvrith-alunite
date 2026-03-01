const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const s3 = require("../config/s3");

// ── Allowed file types per upload category ────────────────
const ALLOWED = {
  resume:      [".pdf", ".doc", ".docx"],
  certificate: [".pdf", ".jpg", ".jpeg", ".png"],
  photo:       [".jpg", ".jpeg", ".png", ".webp"],
};

// ── Build a multer uploader for a given folder + file type ─
function makeUploader(folder, allowedExts, maxMB = 5) {
  return multer({
    storage: multerS3({
      s3,
      bucket: process.env.AWS_S3_BUCKET,
      // Private by default — we'll generate signed URLs to access
      acl: "private",
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key(req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        // e.g. resumes/userId_1716200000000.pdf
        const filename = `${folder}/${req.user.id}_${Date.now()}${ext}`;
        cb(null, filename);
      },
    }),
    limits: { fileSize: maxMB * 1024 * 1024 },
    fileFilter(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedExts.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Only ${allowedExts.join(", ")} files are allowed`));
      }
    },
  });
}

// ── Named uploaders ───────────────────────────────────────
const uploadResume      = makeUploader("resumes",      ALLOWED.resume,      5);
const uploadCertificate = makeUploader("certificates", ALLOWED.certificate, 10);
const uploadPhoto         = makeUploader("photos",        ALLOWED.photo,        3);
const uploadGraduationDoc = makeUploader("graduation_docs", ALLOWED.certificate, 10);

// ── Error handler middleware ──────────────────────────────
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large" });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
}

module.exports = { uploadResume, uploadCertificate, uploadPhoto, uploadGraduationDoc, handleUploadError };
