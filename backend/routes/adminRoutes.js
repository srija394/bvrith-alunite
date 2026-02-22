const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getStats,
  getAllUsers,
  approveAlumni,
  toggleUserActive,
  changeRole,
  deleteUser,
  getMentorshipStats,
  postAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
} = require("../controllers/adminController");

const router = express.Router();
const adminOnly = protect(["admin"]);
const authenticated = protect(["student", "alumni", "admin"]);

// Stats
router.get("/stats", adminOnly, getStats);

// Users
router.get("/users", adminOnly, getAllUsers);
router.patch("/users/:userId/approve", adminOnly, approveAlumni);
router.patch("/users/:userId/toggle-active", adminOnly, toggleUserActive);
router.patch("/users/:userId/role", adminOnly, changeRole);
router.delete("/users/:userId", adminOnly, deleteUser);

// Mentorship stats
router.get("/mentorship-stats", adminOnly, getMentorshipStats);

// Announcements — all users can read, only admin can post/delete
router.get("/announcements", authenticated, getAnnouncements);
router.post("/announcements", adminOnly, postAnnouncement);
router.delete("/announcements/:id", adminOnly, deleteAnnouncement);

module.exports = router;
