const Event = require("../models/Event");

// ─── GET all events (with optional filter) ────────────────
exports.getAllEvents = async (req, res) => {
  try {
    const { category, mode, upcoming } = req.query;
    const query = {};

    if (category) query.category = category;
    if (mode) query.mode = mode;
    if (upcoming === "true") query.date = { $gte: new Date() };

    const events = await Event.find(query)
      .populate("createdBy", "email role")
      .sort({ date: 1 })
      .select("-__v");

    // Attach isRegistered for logged-in user
    const userId = req.user?.id;
    const enriched = events.map((e) => {
      const obj = e.toJSON();
      obj.isRegistered = userId
        ? e.registrations.some((r) => r.user?.toString() === userId)
        : false;
      return obj;
    });

    res.json({ events: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET single event ─────────────────────────────────────
exports.getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("createdBy", "email role")
      .populate("registrations.user", "email");

    if (!event) return res.status(404).json({ message: "Event not found" });

    const obj = event.toJSON();
    obj.isRegistered = req.user
      ? event.registrations.some((r) => r.user?._id?.toString() === req.user.id)
      : false;

    res.json({ event: obj });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── CREATE event (admin + alumni) ───────────────────────
exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, time, venue, mode, meetLink, category, maxAttendees, bannerColor } = req.body;

    const event = await Event.create({
      title, description, date, time, venue,
      mode: mode || "offline",
      meetLink, category: category || "other",
      maxAttendees: maxAttendees || null,
      bannerColor: bannerColor || "#0f3460",
      createdBy: req.user.id,
    });

    // Notify all admins
    const User = require("../models/User");
    const { sendEventCreatedAdminEmail } = require("../utils/emailService");
    const creator = await User.findById(req.user.id).select("email");
    const admins  = await User.find({ role: "admin" }).select("email");
    for (const admin of admins) {
      await sendEventCreatedAdminEmail(admin.email, event, creator?.email).catch(() => {});
    }

    res.status(201).json({ message: "Event created", event });
  } catch (err) {
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(", ") });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// ─── UPDATE event (creator or admin) ─────────────────────
exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Only creator or admin can update
    if (event.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const allowed = ["title", "description", "date", "time", "venue", "mode", "meetLink", "category", "maxAttendees", "bannerColor"];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) event[field] = req.body[field];
    });

    await event.save();
    res.json({ message: "Event updated", event });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE event (creator or admin) ─────────────────────
exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    if (event.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await event.deleteOne();
    res.json({ message: "Event deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── REGISTER for an event ────────────────────────────────
exports.registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Check if past event
    if (new Date(event.date) < new Date()) {
      return res.status(400).json({ message: "Cannot register for a past event" });
    }

    // Check if already registered
    const already = event.registrations.some((r) => r.user?.toString() === req.user.id);
    if (already) return res.status(400).json({ message: "Already registered" });

    // Check capacity
    if (event.maxAttendees && event.registrations.length >= event.maxAttendees) {
      return res.status(400).json({ message: "Event is full" });
    }

    event.registrations.push({ user: req.user.id });
    await event.save();

    // ── Email confirmation to registrant ──
    const { sendEventRegistrationEmail } = require("../utils/emailService");
    const User = require("../models/User");
    const registrant = await User.findById(req.user.id).select("email");
    if (registrant) {
      await sendEventRegistrationEmail(
        registrant.email,
        event.title,
        event.date,
        event.time,
        event.venue
      );
    }

    res.json({ message: "Registered successfully!", registrationCount: event.registrations.length });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── UNREGISTER from an event ─────────────────────────────
exports.unregisterFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const before = event.registrations.length;
    event.registrations = event.registrations.filter(
      (r) => r.user?.toString() !== req.user.id
    );

    if (event.registrations.length === before) {
      return res.status(400).json({ message: "You are not registered for this event" });
    }

    await event.save();
    res.json({ message: "Unregistered successfully", registrationCount: event.registrations.length });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET my registered events ─────────────────────────────
exports.getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({
      "registrations.user": req.user.id,
    }).sort({ date: 1 });

    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET registrations for an event (creator or admin) ───
exports.getEventRegistrations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("registrations.user", "email role")
      .populate("createdBy", "_id email");
    if (!event) return res.status(404).json({ message: "Event not found" });

    const isCreator = event.createdBy._id.toString() === req.user.id;
    const isAdmin   = req.user.role === "admin";
    if (!isCreator && !isAdmin) return res.status(403).json({ message: "Not authorized" });

    const StudentProfile = require("../models/StudentProfile");
    const AlumniProfile  = require("../models/AlumniProfile");

    const registrants = await Promise.all(event.registrations.map(async (r) => {
      const u = r.user;
      if (!u) return null;
      const profile = u.role === "student"
        ? await StudentProfile.findOne({ user: u._id }).select("fullName branch year")
        : await AlumniProfile.findOne({ user: u._id }).select("fullName branch graduationYear");
      return {
        userId: u._id, email: u.email, role: u.role,
        name: profile?.fullName || u.email,
        details: profile,
        registeredAt: r.registeredAt,
      };
    }));

    res.json({
      eventTitle: event.title,
      eventDate: event.date,
      total: registrants.filter(Boolean).length,
      registrants: registrants.filter(Boolean),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
