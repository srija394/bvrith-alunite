const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "mentorship_request",
        "mentorship_accepted",
        "mentorship_rejected",
        "new_message",
        "event_registered",
        "event_reminder",
        "announcement",
        "alumni_approved",
        "job_posted",
        "system",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String, // e.g. "/mentorship/inbox"
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for efficient unread queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
