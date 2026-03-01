const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: false, // Optional for Google OAuth users
    default: null,
  },
  role: {
    type: String,
    enum: ["student", "alumni", "admin"],
    required: true
  },
  googleId: {
    type: String,
    default: null,
    index: true,
    sparse: true,
  },
  // Flag for Google OAuth users who still need to pick a role
  needsRoleSelection: {
    type: Boolean,
    default: false,
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    code: { type: String },
    expiresAt: { type: Date }
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
