const StudentProfile = require("../models/StudentProfile");
const AlumniProfile = require("../models/AlumniProfile");

// Helper: pick the right model based on role
const getModel = (role) =>
  role === "student" ? StudentProfile : AlumniProfile;

// ─── GET my profile ───────────────────────────────────────
exports.getMyProfile = async (req, res) => {
  try {
    const Model = getModel(req.user.role);
    const profile = await Model.findOne({ user: req.user.id }).populate(
      "user",
      "email role"
    );
    if (!profile)
      return res.status(404).json({ message: "Profile not found", exists: false });
    res.json({ exists: true, profile });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── CREATE profile ───────────────────────────────────────
exports.createProfile = async (req, res) => {
  try {
    const Model = getModel(req.user.role);

    const existing = await Model.findOne({ user: req.user.id });
    if (existing)
      return res.status(400).json({ message: "Profile already exists. Use PUT to update." });

    const profile = await Model.create({ ...req.body, user: req.user.id });
    res.status(201).json({ message: "Profile created", profile });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// ─── UPDATE profile ───────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const Model = getModel(req.user.role);

    // Prevent overriding the user reference
    delete req.body.user;

    const profile = await Model.findOneAndUpdate(
      { user: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!profile)
      return res.status(404).json({ message: "Profile not found. Create one first." });

    res.json({ message: "Profile updated", profile });
  } catch (err) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET profile by userId (public view) ─────────────────
exports.getProfileById = async (req, res) => {
  try {
    const { id, role } = req.params;
    const Model = getModel(role);
    const profile = await Model.findOne({ user: id }).populate("user", "email role");
    if (!profile)
      return res.status(404).json({ message: "Profile not found" });

    const obj = profile.toObject();

    // Generate signed URLs for all S3 files
    if (profile.resumeKey || profile.certificates?.length > 0 || profile.photoKey) {
      try {
        const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
        const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
        const s3 = new S3Client({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });

        const sign = (key) => {
          if (!key) return null;
          const cmd = new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key });
          return getSignedUrl(s3, cmd, { expiresIn: 3600 });
        };

        // Resume URL
        if (profile.resumeKey) obj.resumeUrl = await sign(profile.resumeKey);

        // Photo URL
        if (profile.photoKey) obj.photoUrl = await sign(profile.photoKey);

        // Certificate URLs — attach url to each cert object
        if (profile.certificates?.length > 0) {
          obj.certificates = await Promise.all(
            profile.certificates.map(async (cert) => ({
              ...cert,
              url: await sign(cert.key),
            }))
          );
        }
      } catch (e) {
        console.warn("Signed URL generation failed:", e.message);
      }
    }

    res.json({ profile: obj });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET all alumni profiles with search, filter, pagination ─
exports.getAllAlumni = async (req, res) => {
  try {
    const {
      search = "",
      branch = "",
      graduationYear = "",
      skills = "",
      page = 1,
      limit = 12,
    } = req.query;

    const query = {};

    // Full-text search on name, company, role, location
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [
        { fullName: regex },
        { currentCompany: regex },
        { currentRole: regex },
        { location: regex },
      ];
    }

    // Filter by branch
    if (branch) query.branch = branch;

    // Filter by graduation year
    if (graduationYear) query.graduationYear = Number(graduationYear);

    // Filter by skills (any match)
    if (skills) {
      const skillList = skills.split(",").map((s) => s.trim()).filter(Boolean);
      if (skillList.length) query.skills = { $in: skillList.map((s) => new RegExp(s, "i")) };
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Only show approved alumni
    const User = require("../models/User");
    const approvedAlumniIds = await User.find({ role: "alumni", isApproved: true }).select("_id");
    const approvedIds = approvedAlumniIds.map(u => u._id);
    query.user = { $in: approvedIds };

    const [profiles, total] = await Promise.all([
      AlumniProfile.find(query)
        .populate("user", "email")
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      AlumniProfile.countDocuments(query),
    ]);

    res.json({
      profiles,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET distinct filter options (for dropdowns) ──────────
exports.getAlumniFilterOptions = async (req, res) => {
  try {
    const User = require("../models/User");
    const approvedAlumniUsers = await User.find({ role: "alumni", isApproved: true }).select("_id");
    const approvedIds = approvedAlumniUsers.map(u => u._id);

    const matchFilter = { user: { $in: approvedIds } };

    const [branches, years, skills] = await Promise.all([
      AlumniProfile.distinct("branch", matchFilter),
      AlumniProfile.distinct("graduationYear", matchFilter),
      AlumniProfile.distinct("skills", matchFilter),
    ]);
    res.json({
      branches: branches.filter(Boolean).sort(),
      years: years.filter(Boolean).sort((a, b) => b - a),
      skills: skills.filter(Boolean).sort(),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET all student profiles (admin only) ───────────────
exports.getAllStudents = async (req, res) => {
  try {
    const profiles = await StudentProfile.find()
      .populate("user", "email")
      .select("-__v");
    res.json({ profiles });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};