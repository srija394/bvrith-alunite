const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const AlumniProfile = require("../models/AlumniProfile");
const MentorshipRequest = require("../models/MentorshipRequest");
const Event = require("../models/Event");
const Message = require("../models/Message");
const Announcement = require("../models/Announcement");

// ─── GET overview stats ───────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalAlumni,
      pendingAlumni,
      totalMentorships,
      acceptedMentorships,
      totalEvents,
      totalMessages,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "alumni" }),
      User.countDocuments({ role: "alumni", isApproved: false }),
      MentorshipRequest.countDocuments(),
      MentorshipRequest.countDocuments({ status: "accepted" }),
      Event.countDocuments(),
      Message.countDocuments(),
    ]);

    res.json({
      totalUsers,
      totalStudents,
      totalAlumni,
      pendingAlumni,
      totalMentorships,
      acceptedMentorships,
      totalEvents,
      totalMessages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET all users with profiles ─────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query = { role: { $ne: "admin" } };
    if (role) query.role = role;
    if (search) query.email = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).select("-password"),
      User.countDocuments(query),
    ]);

    // Attach profile names
    const enriched = await Promise.all(
      users.map(async (u) => {
        const profile = u.role === "student"
          ? await StudentProfile.findOne({ user: u._id }).select("fullName branch year")
          : await AlumniProfile.findOne({ user: u._id }).select("fullName currentCompany graduationYear");
        return { ...u.toObject(), profile };
      })
    );

    res.json({ users: enriched, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── APPROVE alumni ───────────────────────────────────────
exports.approveAlumni = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "alumni") return res.status(400).json({ message: "User is not alumni" });

    user.isApproved = true;
    await user.save();
    res.json({ message: "Alumni approved successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── TOGGLE user active status (deactivate/reactivate) ───
exports.toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(403).json({ message: "Cannot deactivate admin" });

    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? "activated" : "deactivated"}`, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── CHANGE user role ─────────────────────────────────────
exports.changeRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["student", "alumni"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(403).json({ message: "Cannot change admin role" });

    user.role = role;
    await user.save();
    res.json({ message: `Role changed to ${role}` });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE user ──────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role === "admin") return res.status(403).json({ message: "Cannot delete admin" });

    await user.deleteOne();
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET mentorship stats ─────────────────────────────────
exports.getMentorshipStats = async (req, res) => {
  try {
    const [pending, accepted, rejected] = await Promise.all([
      MentorshipRequest.countDocuments({ status: "pending" }),
      MentorshipRequest.countDocuments({ status: "accepted" }),
      MentorshipRequest.countDocuments({ status: "rejected" }),
    ]);

    // Recent requests with names
    const recent = await MentorshipRequest.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("student", "email")
      .populate("alumni", "email");

    const enriched = await Promise.all(
      recent.map(async (r) => {
        const studentProfile = await StudentProfile.findOne({ user: r.student?._id }).select("fullName");
        const alumniProfile  = await AlumniProfile.findOne({ user: r.alumni?._id }).select("fullName");
        return {
          _id: r._id,
          status: r.status,
          matchScore: r.matchScore,
          createdAt: r.createdAt,
          studentEmail: r.student?.email,
          studentName: studentProfile?.fullName,
          alumniEmail: r.alumni?.email,
          alumniName: alumniProfile?.fullName,
        };
      })
    );

    res.json({ pending, accepted, rejected, total: pending + accepted + rejected, recent: enriched });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST announcement ────────────────────────────────────
exports.postAnnouncement = async (req, res) => {
  try {
    const { title, content, targetRole, pinned } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      targetRole: targetRole || "all",
      pinned: !!pinned,
      postedBy: req.user.id,
    });

    res.status(201).json({ message: "Announcement posted", announcement });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET announcements ────────────────────────────────────
exports.getAnnouncements = async (req, res) => {
  try {
    const { role } = req.query; // filter by target role
    const query = {};
    if (role && role !== "admin") {
      query.$or = [{ targetRole: "all" }, { targetRole: role }];
    }

    const announcements = await Announcement.find(query)
      .sort({ pinned: -1, createdAt: -1 })
      .populate("postedBy", "email");

    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE announcement ──────────────────────────────────
exports.deleteAnnouncement = async (req, res) => {
  try {
    const a = await Announcement.findById(req.params.id);
    if (!a) return res.status(404).json({ message: "Not found" });
    await a.deleteOne();
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
