const mongoose = require("mongoose");

const forumPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 5000 },
    category: {
      type: String,
      enum: ["career", "technical", "placement", "campus", "general"],
      default: "general",
    },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    views: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

forumPostSchema.index({ title: "text", content: "text" });

module.exports = mongoose.model("ForumPost", forumPostSchema);
