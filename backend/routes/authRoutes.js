const express = require("express");
const { register, login, verifyOTP, resendOTP, getMe, updateEmail, changePassword } = require("../controllers/authController");
const { googleLogin, googleSetRole } = require("../controllers/googleAuthController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", login);

router.post("/google", googleLogin);
router.post("/google/set-role", googleSetRole);

// Authenticated user info + email update (used for post-conversion banner)
router.get("/me", protect(["student", "alumni", "admin"]), getMe);
router.put("/update-email", protect(["alumni"]), updateEmail);
router.put("/change-password", protect(["student", "alumni", "admin"]), changePassword);

module.exports = router;