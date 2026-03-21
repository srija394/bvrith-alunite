// backend/models/StudentProfile.js
// UPDATED — added isGraduated and graduatedAt fields for bulk conversion support

const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    fullName: { type: String, required: true, trim: true },
    rollNumber: { type: String, required: true, trim: true },
    branch: {
      type: String,
      required: true,
      enum: ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AIDS", "AIML", "CSD"],
    },
    year: { type: Number, required: true, min: 1, max: 4 },
    section: { type: String, trim: true },
    phone: { type: String, trim: true },
    linkedIn: { type: String, trim: true },
    github: { type: String, trim: true },
    skills: [
      {
        name:  { type: String, trim: true, required: true },
        level: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Beginner" },
      },
    ],
    bio: { type: String, maxlength: 500 },
    cgpa: { type: Number, min: 0, max: 10 },
    graduationYear: { type: Number },
    profilePhoto: { type: String },
    photoKey: { type: String },
    resumeKey: { type: String },
    resumeName: { type: String },
    achievements: [
      {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true, maxlength: 500 },
        date: { type: Date },
        link: { type: String, trim: true },
      },
    ],
    certificates: [
      {
        key: { type: String },
        name: { type: String },
        originalName: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Graduation / Conversion fields (NEW) ──────────────────────────────
    // Set to true after admin bulk-converts this student to alumni
    // StudentProfile is NEVER deleted — this flag marks the transition
    isGraduated: { type: Boolean, default: false, index: true },
    // Timestamp when the conversion was executed (for rollback safety window)
    graduatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound index for fast graduation-year + branch queries used in conversion
studentProfileSchema.index({ graduationYear: 1, branch: 1, isGraduated: 1 });

module.exports = mongoose.model("StudentProfile", studentProfileSchema);
