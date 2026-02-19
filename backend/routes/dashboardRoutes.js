const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/student", protect(["student"]), (req, res) => {
  res.json({ message: "Student dashboard", user: req.user });
});

router.get("/alumni", protect(["alumni"]), (req, res) => {
  res.json({ message: "Alumni dashboard", user: req.user });
});

router.get("/admin", protect(["admin"]), (req, res) => {
  res.json({ message: "Admin dashboard", user: req.user });
});

module.exports = router;
