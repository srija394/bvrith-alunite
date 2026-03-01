const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  getUnreadCount,
} = require("../controllers/notificationController");

const router = express.Router();
const authenticated = protect(["student", "alumni", "admin"]);

router.get("/", authenticated, getNotifications);
router.get("/unread-count", authenticated, getUnreadCount);
router.patch("/:id/read", authenticated, markRead);
router.patch("/mark-all-read", authenticated, markAllRead);
router.delete("/:id", authenticated, deleteNotification);

module.exports = router;
