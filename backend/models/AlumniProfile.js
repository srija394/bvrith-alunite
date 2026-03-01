const mongoose = require("mongoose");

const alumniProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    fullName: { type: String, required: true, trim: true },
    rollNumber: { type: String, trim: true },
    branch: { type: String, required: true, enum: ["CSE","IT","ECE","EEE","MECH","CIVIL","AIDS","AIML","CSD"] },
    graduationYear: { type: Number, required: true },
    phone: { type: String, trim: true },
    linkedIn: { type: String, trim: true },
    github: { type: String, trim: true },
    currentCompany: { type: String, trim: true },
    currentRole: { type: String, trim: true },
    location: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    bio: { type: String, maxlength: 500 },
    profilePhoto: { type: String },
    photoKey: { type: String },
    isAvailableForMentorship: { type: Boolean, default: false },
    availableForTalks: { type: Boolean, default: false },
    portfolioUrl: { type: String, trim: true },
    webinarTopics: [{ type: String, trim: true }],
    resumeKey: { type: String },
    resumeName: { type: String },
    // Graduation document (marksheet / degree cert) — for admin approval
    graduationDocKey: { type: String },
    graduationDocName: { type: String },
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("AlumniProfile", alumniProfileSchema);
