const mongoose = require("mongoose");

const forumReplySchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "ForumPost", required: true },
    content: { type: String, required: true, maxlength: 2000 },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ForumReply", forumReplySchema);
