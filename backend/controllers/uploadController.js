const { GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../config/s3");
const StudentProfile = require("../models/StudentProfile");
const AlumniProfile  = require("../models/AlumniProfile");

const BUCKET = process.env.AWS_S3_BUCKET;

// Helper: get profile model for current user
const getProfile = (role, userId) => {
  const Model = role === "student" ? StudentProfile : AlumniProfile;
  return Model.findOne({ user: userId });
};

// Helper: generate a 1-hour signed URL for a private S3 key
async function signedUrl(key) {
  if (!key) return null;
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: 3600 });
}

// Helper: delete an old S3 object safely
async function deleteS3Object(key) {
  if (!key) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (err) {
    console.warn("S3 delete warning:", err.message);
  }
}

// ─── POST /api/upload/resume ──────────────────────────────
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const profile = await getProfile(req.user.role, req.user.id);
    if (!profile) return res.status(404).json({ message: "Profile not found. Create profile first." });

    // Delete old resume from S3 if exists
    if (profile.resumeKey) await deleteS3Object(profile.resumeKey);

    profile.resumeKey = req.file.key;
    profile.resumeName = req.file.originalname;
    await profile.save();

    const url = await signedUrl(req.file.key);
    res.json({ message: "Resume uploaded successfully", url, fileName: req.file.originalname });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
};

// ─── POST /api/upload/certificate ────────────────────────
exports.uploadCertificate = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const profile = await getProfile(req.user.role, req.user.id);
    if (!profile) return res.status(404).json({ message: "Profile not found. Create profile first." });

    const certName = req.body.certName || req.file.originalname;

    // Add to certificates array
    profile.certificates = profile.certificates || [];
    profile.certificates.push({
      key: req.file.key,
      name: certName,
      originalName: req.file.originalname,
      uploadedAt: new Date(),
    });
    await profile.save();

    const url = await signedUrl(req.file.key);
    res.json({
      message: "Certificate uploaded successfully",
      certificate: {
        key: req.file.key,
        name: certName,
        url,
        uploadedAt: new Date(),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
};

// ─── POST /api/upload/photo ───────────────────────────────
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const profile = await getProfile(req.user.role, req.user.id);
    if (!profile) return res.status(404).json({ message: "Profile not found. Create profile first." });

    // Delete old photo
    if (profile.photoKey) await deleteS3Object(profile.photoKey);

    profile.photoKey = req.file.key;
    profile.profilePhoto = req.file.location; // public URL if bucket is public, else use signed
    await profile.save();

    const url = await signedUrl(req.file.key);
    res.json({ message: "Photo uploaded successfully", url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
};

// ─── GET /api/upload/my-files ─────────────────────────────
exports.getMyFiles = async (req, res) => {
  try {
    const profile = await getProfile(req.user.role, req.user.id);
    if (!profile) return res.json({ resume: null, certificates: [], photo: null });

    // Generate signed URLs for all files
    const resumeUrl = await signedUrl(profile.resumeKey);
    const photoUrl  = await signedUrl(profile.photoKey);

    const certificates = await Promise.all(
      (profile.certificates || []).map(async (cert) => ({
        key: cert.key,
        name: cert.name,
        originalName: cert.originalName,
        uploadedAt: cert.uploadedAt,
        url: await signedUrl(cert.key),
      }))
    );

    res.json({
      resume: profile.resumeKey
        ? { key: profile.resumeKey, name: profile.resumeName, url: resumeUrl }
        : null,
      photo: profile.photoKey ? { key: profile.photoKey, url: photoUrl } : null,
      certificates,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE /api/upload/certificate/:key ─────────────────
exports.deleteCertificate = async (req, res) => {
  try {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    const profile = await getProfile(req.user.role, req.user.id);
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const before = (profile.certificates || []).length;
    profile.certificates = (profile.certificates || []).filter(
      (c) => c.key !== decodedKey
    );

    if (profile.certificates.length === before) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    await deleteS3Object(decodedKey);
    await profile.save();

    res.json({ message: "Certificate deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/upload/graduation-doc (alumni only) ────────
exports.uploadGraduationDoc = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    if (req.user.role !== "alumni") return res.status(403).json({ message: "Alumni only" });

    const profile = await AlumniProfile.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ message: "Create your profile first" });

    if (profile.graduationDocKey) await deleteS3Object(profile.graduationDocKey);
    profile.graduationDocKey  = req.file.key;
    profile.graduationDocName = req.file.originalname;
    await profile.save();

    const url = await signedUrl(req.file.key);
    res.json({ message: "Graduation document uploaded", url, fileName: req.file.originalname });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
};

// ─── POST /api/upload/event-banner (alumni + admin) ───────
exports.uploadEventBanner = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    if (!["alumni", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const Event = require("../models/Event");
    const { eventId } = req.body;
    if (!eventId) return res.status(400).json({ message: "eventId is required" });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Only owner or admin can update banner
    const isOwner = event.createdBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Delete old banner if exists
    if (event.bannerKey) await deleteS3Object(event.bannerKey);

    event.bannerKey = req.file.key;
    event.bannerUrl = req.file.location || null;
    await event.save();

    const url = await signedUrl(req.file.key);
    res.json({ message: "Event banner uploaded", url, key: req.file.key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
};
