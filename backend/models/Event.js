const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, maxlength: 2000 },
    date: { type: Date, required: true },
    time: { type: String, required: true }, // e.g. "10:00 AM"
    venue: { type: String, required: true, trim: true },
    mode: { type: String, enum: ["online", "offline", "hybrid"], default: "offline" },
    meetLink: { type: String, trim: true }, // for online events
    category: {
      type: String,
      enum: ["webinar", "workshop", "reunion", "talk", "hackathon", "other"],
      default: "other",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    registrations: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        registeredAt: { type: Date, default: Date.now },
      },
    ],
    maxAttendees: { type: Number, default: null }, // null = unlimited
    bannerColor: { type: String, default: "#0f3460" }, // fallback banner color
    bannerKey: { type: String },   // S3 key for uploaded banner image
    bannerUrl: { type: String },   // public/signed URL for display
  },
  { timestamps: true }
);

// Virtual: registration count
eventSchema.virtual("registrationCount").get(function () {
  return this.registrations.length;
});

eventSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Event", eventSchema);
