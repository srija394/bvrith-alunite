const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getAllEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  unregisterFromEvent,
  getMyEvents,
} = require("../controllers/eventController");

const router = express.Router();

// Public-ish (but need auth for isRegistered flag)
router.get("/", protect(["student", "alumni", "admin"]), getAllEvents);
router.get("/my", protect(["student", "alumni"]), getMyEvents);
router.get("/:id", protect(["student", "alumni", "admin"]), getEvent);

// Create / Edit / Delete — alumni and admin only
router.post("/", protect(["alumni", "admin"]), createEvent);
router.put("/:id", protect(["alumni", "admin"]), updateEvent);
router.delete("/:id", protect(["alumni", "admin"]), deleteEvent);

// Register / Unregister — all logged-in users
router.post("/:id/register", protect(["student", "alumni"]), registerForEvent);
router.delete("/:id/register", protect(["student", "alumni"]), unregisterFromEvent);

module.exports = router;
