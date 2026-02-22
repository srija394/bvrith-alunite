const mongoose = require("mongoose");

const alumniProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    fullName: { type: String, required: true, trim: true },
    rollNumber: { type: String, trim: true },
    branch: {
      type: String,
      required: true,
      enum: ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AIDS", "AIML", "CSD"],
    },
    graduationYear: { type: Number, required: true },
    phone: { type: String, trim: true },
    linkedIn: { type: String, trim: true },
    github: { type: String, trim: true },
    currentCompany: { type: String, trim: true },
    currentRole: { type: String, trim: true },
    location: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    bio: { type: String, maxlength: 500 },
    profilePhoto: { type: String }, // URL or signed URL
    photoKey: { type: String },     // S3 key for photo
    isAvailableForMentorship: { type: Boolean, default: false },
    resumeKey: { type: String },    // S3 key
    resumeName: { type: String },   // original filename
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
