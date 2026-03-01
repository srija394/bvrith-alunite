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
    skillsRequired: [{ type: String, trim: true }],
    stipend: { type: String, trim: true },       // e.g. "₹15,000/month" or "Unpaid"
    salary: { type: String, trim: true },         // for full-time jobs
    duration: { type: String, trim: true },       // e.g. "3 months" for internships
    applyLink: { type: String, trim: true },      // external apply URL
    deadline: { type: Date },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

jobSchema.index({ title: "text", company: "text", description: "text" });

module.exports = mongoose.model("Job", jobSchema);
