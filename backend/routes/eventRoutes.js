const express = require("express");
const { protect, requireApproved } = require("../middleware/authMiddleware");
const {
  getAllEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  unregisterFromEvent,
  getMyEvents,
  getEventRegistrations,
} = require("../controllers/eventController");

const router = express.Router();

// Public-ish (but need auth for isRegistered flag) — unapproved alumni can view events
router.get("/", protect(["student", "alumni", "admin"]), getAllEvents);
router.get("/my", protect(["student", "alumni"]), getMyEvents);
router.get("/:id", protect(["student", "alumni", "admin"]), getEvent);

// Create / Edit / Delete — alumni must be approved
router.post("/", protect(["alumni", "admin"]), requireApproved, createEvent);
router.put("/:id", protect(["alumni", "admin"]), requireApproved, updateEvent);
router.delete("/:id", protect(["alumni", "admin"]), requireApproved, deleteEvent);

// Register / Unregister — alumni must be approved
router.post("/:id/register", protect(["student", "alumni"]), requireApproved, registerForEvent);
router.delete("/:id/register", protect(["student", "alumni"]), requireApproved, unregisterFromEvent);
router.get("/:id/registrations", protect(["alumni", "admin"]), requireApproved, getEventRegistrations);

module.exports = router;
