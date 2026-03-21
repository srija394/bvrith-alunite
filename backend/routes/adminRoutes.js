const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getStats,
  getAnalytics,
  getAllUsers,
  approveAlumni,
  toggleUserActive,
  changeRole,
  deleteUser,
  rejectAlumni,
  getAlumniProfileForReview,
  getAllEventsAdmin,
  getEventRegistrations,
  getMentorshipStats,
  postAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
  exportUsers,
  exportMentorship,
  exportEvents,
  getAllJobsAdmin,
  getJobMatchesAdmin,
  exportJobMatches,
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
router.delete("/users/:userId/reject", adminOnly, rejectAlumni);
router.get("/users/:userId/alumni-profile", adminOnly, getAlumniProfileForReview);

// Events admin
router.get("/events", adminOnly, getAllEventsAdmin);
router.get("/events/:eventId/registrations", adminOnly, getEventRegistrations);

// Mentorship stats
router.get("/mentorship-stats", adminOnly, getMentorshipStats);

// Announcements — all users can read, only admin can post/delete
router.get("/announcements", authenticated, getAnnouncements);
router.post("/announcements", adminOnly, postAnnouncement);
router.delete("/announcements/:id", adminOnly, deleteAnnouncement);

// Analytics
router.get("/analytics", adminOnly, getAnalytics);

// CSV Exports
router.get("/export/users", adminOnly, exportUsers);
router.get("/export/mentorship", adminOnly, exportMentorship);
router.get("/export/events", adminOnly, exportEvents);

// Jobs — admin view + matched students + CSV export
router.get("/jobs", adminOnly, getAllJobsAdmin);
router.get("/jobs/:id/matches", adminOnly, getJobMatchesAdmin);
router.get("/jobs/:id/export-matches", adminOnly, exportJobMatches);

module.exports = router;