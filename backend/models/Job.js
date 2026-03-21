const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["job", "internship"],
      required: true,
    },
    location: { type: String, trim: true },
    mode: { type: String, enum: ["remote", "onsite", "hybrid"], default: "onsite" },
    description: { type: String, required: true, maxlength: 3000 },

    // ── Skills required — plain names only, no level (NEW) ──────────────
    // Levels belong to the student's profile, not the job posting.
    skillsRequired: [{ type: String, trim: true }],

    // ── Skill-based matched students (NEW) ──────────────────────────────
    matchedStudents: [
      {
        studentId:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        score:        { type: Number },
        matchedCount: { type: Number }, // how many required skills the student has
        fullName:     { type: String },
        branch:       { type: String },
        cgpa:         { type: Number },
      },
    ],

    stipend:   { type: String, trim: true },
    salary:    { type: String, trim: true },
    duration:  { type: String, trim: true },
    applyLink: { type: String, trim: true },
    deadline:  { type: Date },
    postedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isActive:  { type: Boolean, default: true },
  },
  { timestamps: true }
);

jobSchema.index({ title: "text", company: "text", description: "text" });

module.exports = mongoose.model("Job", jobSchema);
