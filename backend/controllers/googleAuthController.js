const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google
 * Body: { idToken: "<Google ID token from frontend>" }
 *
 * Flow:
 *  1. Verify the Google ID token.
 *  2. If user with that googleId already exists → issue JWT.
 *  3. If user with that email already exists (local account) → link googleId and issue JWT.
 *  4. If brand new user → create with needsRoleSelection=true, return { needsRoleSelection: true, tempToken }.
 *     The frontend then shows a role picker, POSTs to /api/auth/google/set-role.
 */
exports.googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "idToken required" });

    // Verify with Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { sub: googleId, email, email_verified } = ticket.getPayload();

    if (!email_verified) {
      return res.status(400).json({ message: "Google email not verified" });
    }

    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if a local account exists with this email — link it
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        user.isEmailVerified = true; // Google already verified it
        await user.save();
      }
    }

    if (!user) {
      // Brand-new user — needs role selection before we can fully register them
      // Issue a short-lived "temp" token that only works for /google/set-role
      const tempToken = jwt.sign(
        { googleId, email, temp: true },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
      );
      return res.status(200).json({
        needsRoleSelection: true,
        tempToken,
        email,
      });
    }

    // Existing user — issue full JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, isApproved: user.isApproved },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, role: user.role, email: user.email });
  } catch (err) {
    console.error("[Google OAuth]", err);
    res.status(500).json({ message: "Google authentication failed" });
  }
};

/**
 * POST /api/auth/google/set-role
 * Body: { tempToken, role: "student" | "alumni" }
 * Called after new Google users pick their role.
 */
exports.googleSetRole = async (req, res) => {
  try {
    const { tempToken, role } = req.body;

    if (!tempToken || !role)
      return res.status(400).json({ message: "tempToken and role are required" });

    if (!["student", "alumni"].includes(role))
      return res.status(400).json({ message: "Role must be student or alumni" });

    let payload;
    try {
      payload = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired temp token" });
    }

    if (!payload.temp)
      return res.status(400).json({ message: "Invalid token type" });

    const { googleId, email } = payload;

    // Create the user now that we have a role
    const newUser = await User.create({
      email,
      googleId,
      role,
      isEmailVerified: true,
      isApproved: role !== "alumni", // Alumni still need admin approval
      needsRoleSelection: false,
    });

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, isApproved: newUser.isApproved },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token, role: newUser.role, email: newUser.email });
  } catch (err) {
    console.error("[Google Set Role]", err);
    res.status(500).json({ message: "Failed to complete registration" });
  }
};
