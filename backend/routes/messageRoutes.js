const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  sendMessage,
  getConversation,
  getInbox,
  getUnreadCount,
} = require("../controllers/messageController");

const router = express.Router();

// All authenticated users can message
router.post("/send", protect(["student", "alumni"]), sendMessage);
router.get("/inbox", protect(["student", "alumni"]), getInbox);
router.get("/unread", protect(["student", "alumni"]), getUnreadCount);
router.get("/conversation/:userId", protect(["student", "alumni"]), getConversation);

module.exports = router;
