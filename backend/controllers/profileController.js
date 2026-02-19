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
    res.json({ profile });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET all alumni profiles (for directory) ─────────────
exports.getAllAlumni = async (req, res) => {
  try {
    const profiles = await AlumniProfile.find()
      .populate("user", "email")
      .select("-__v");
    res.json({ profiles });
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
