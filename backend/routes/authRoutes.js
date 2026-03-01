const express = require("express");
const { register, login, verifyOTP, resendOTP } = require("../controllers/authController");
const { googleLogin, googleSetRole } = require("../controllers/googleAuthController");

const router = express.Router();

router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/login", login);

router.post("/google", googleLogin);
router.post("/google/set-role", googleSetRole);

module.exports = router;
