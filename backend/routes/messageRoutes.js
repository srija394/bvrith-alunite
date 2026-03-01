const express = require("express");
const { protect, requireApproved } = require("../middleware/authMiddleware");
const {
  sendMessage,
  getConversation,
  getInbox,
  getUnreadCount,
} = require("../controllers/messageController");

const router = express.Router();

// All authenticated users can message — alumni must be approved
router.post("/send", protect(["student", "alumni"]), requireApproved, sendMessage);
router.get("/inbox", protect(["student", "alumni"]), requireApproved, getInbox);
router.get("/unread", protect(["student", "alumni"]), requireApproved, getUnreadCount);
router.get("/conversation/:userId", protect(["student", "alumni"]), requireApproved, getConversation);

module.exports = router;
