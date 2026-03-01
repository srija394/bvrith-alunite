const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendOTPEmail, sendWelcomeEmail } = require("../utils/emailService");

// ── Generate 6-digit OTP ──────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── POST /api/auth/register ──────────────────────────────
// Step 1: Create unverified account + send OTP
exports.register = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role)
      return res.status(400).json({ message: "All fields required" });

    if (!["student", "alumni", "admin"].includes(role))
    return res.status(400).json({ message: "Invalid role" });

    // Admin registration requires secret code
    if (role === "admin") {
      const { adminCode } = req.body;
      const validCode = process.env.ADMIN_SECRET_CODE || "BVRITH@Admin2025";
      if (!adminCode || adminCode !== validCode) {
        return res.status(403).json({ message: "Invalid admin secret code" });
      }
    }

    if (password.length < 6)
      return res.status(400).json({ message: "Password must be 6+ chars" });

    // Check if already fully registered
    const existing = await User.findOne({ email });
    if (existing && existing.isEmailVerified) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (existing) {
      // Resend OTP to existing unverified account
      existing.password = hashedPassword;
      existing.role = role;
      existing.isApproved = role !== "alumni"; // alumni need admin approval
      existing.otp = { code: otp, expiresAt: otpExpiresAt };
      await existing.save();
    } else {
      await User.create({
        email,
        password: hashedPassword,
        role,
        isEmailVerified: false,
        isApproved: role !== "alumni", // alumni start as unapproved
        otp: { code: otp, expiresAt: otpExpiresAt },
      });
    }

    // Send OTP email
    await sendOTPEmail(email, otp);

    res.status(201).json({
      message: "OTP sent to your email. Please verify to complete registration.",
      email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/auth/verify-otp ────────────────────────────
// Step 2: Verify OTP → activate account
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.isEmailVerified)
      return res.status(400).json({ message: "Email already verified" });

    if (!user.otp?.code)
      return res.status(400).json({ message: "No OTP found. Please register again." });

    if (new Date() > user.otp.expiresAt)
      return res.status(400).json({ message: "OTP has expired. Please register again." });

    if (user.otp.code !== otp.trim())
      return res.status(400).json({ message: "Incorrect OTP. Please try again." });

    // Mark verified, clear OTP
    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(email, user.role);

    res.json({ message: "Email verified successfully! You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/auth/resend-otp ────────────────────────────
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.isEmailVerified)
      return res.status(400).json({ message: "Email already verified" });

    const otp = generateOTP();
    user.otp = { code: otp, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
    await user.save();

    await sendOTPEmail(email, otp);

    res.json({ message: "New OTP sent to your email." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    if (!user.isEmailVerified)
      return res.status(403).json({
        message: "Email not verified. Please check your inbox for the OTP.",
        needsVerification: true,
        email,
      });

    if (!user.isActive)
      return res.status(403).json({ message: "Your account has been deactivated. Contact admin." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ token, role: user.role, email: user.email });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
