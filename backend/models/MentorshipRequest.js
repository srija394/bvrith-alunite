const mongoose = require("mongoose");

const mentorshipRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    alumni: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      maxlength: 500,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    matchScore: {
      type: Number, // cosine similarity score 0-1
      default: 0,
    },
  },
  { timestamps: true }
);

// One active request per student-alumni pair
mentorshipRequestSchema.index({ student: 1, alumni: 1 }, { unique: true });

module.exports = mongoose.model("MentorshipRequest", mentorshipRequestSchema);
