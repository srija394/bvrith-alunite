const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["student", "alumni", "admin"],
    required: true
  },
  isApproved: {
    type: Boolean,
    default: true  // students auto-approved; alumni can be set to false for review flow
  },
  isActive: {
    type: Boolean,
    default: true
  },
  announcement: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
