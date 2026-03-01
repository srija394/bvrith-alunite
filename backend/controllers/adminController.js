const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const AlumniProfile = require("../models/AlumniProfile");
const MentorshipRequest = require("../models/MentorshipRequest");
const Event = require("../models/Event");
const Message = require("../models/Message");
const Announcement = require("../models/Announcement");
const { createNotification } = require("../utils/notificationHelper");

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

    // Cascade delete profile + user
    await AlumniProfile.deleteOne({ user: user._id });
    await StudentProfile.deleteOne({ user: user._id });
    await user.deleteOne();

    res.json({ message: "User and profile deleted" });
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

    // Notify relevant users in background (best-effort)
    const roleFilter = announcement.targetRole === "all"
      ? { role: { $in: ["student", "alumni"] } }
      : { role: announcement.targetRole };
    const notifUsers = await User.find(roleFilter).select("_id");
    await Promise.all(
      notifUsers.map((u) =>
        createNotification(u._id, "announcement", `📣 New announcement: ${title.trim()}`, "/events")
      )
    );

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

// ─── DELETE reject + remove alumni account ────────────────
exports.rejectAlumni = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== "alumni") return res.status(400).json({ message: "User is not alumni" });

    const { sendAlumniRejectedEmail } = require("../utils/emailService");
    await sendAlumniRejectedEmail(user.email);

    await AlumniProfile.deleteOne({ user: user._id });
    await user.deleteOne();

    res.json({ message: "Alumni rejected and removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET alumni profile for admin review (with signed S3 URLs) ─
exports.getAlumniProfileForReview = async (req, res) => {
  try {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
    const s3 = require("../config/s3");
    const sign = async (key) => {
      if (!key) return null;
      return getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key }), { expiresIn: 3600 });
    };

    const user    = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    const profile = await AlumniProfile.findOne({ user: user._id });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    const certs = await Promise.all((profile.certificates || []).map(async (c) => ({
      key: c.key, name: c.name, originalName: c.originalName, uploadedAt: c.uploadedAt,
      url: await sign(c.key),
    })));

    res.json({
      user: { _id: user._id, email: user.email, isApproved: user.isApproved, createdAt: user.createdAt },
      profile: {
        fullName: profile.fullName,
        rollNumber: profile.rollNumber,
        branch: profile.branch,
        graduationYear: profile.graduationYear,
        phone: profile.phone,
        linkedIn: profile.linkedIn,
        currentCompany: profile.currentCompany,
        currentRole: profile.currentRole,
        location: profile.location,
        skills: profile.skills,
        bio: profile.bio,
        isAvailableForMentorship: profile.isAvailableForMentorship,
        photoUrl:          await sign(profile.photoKey),
        resumeUrl:         await sign(profile.resumeKey),
        resumeName:        profile.resumeName,
        graduationDocUrl:  await sign(profile.graduationDocKey),
        graduationDocName: profile.graduationDocName,
        certificates: certs,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET all event registrations (admin view) ─────────────
exports.getEventRegistrations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate("registrations.user", "email role")
      .populate("createdBy", "email");
    if (!event) return res.status(404).json({ message: "Event not found" });

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
      createdBy: event.createdBy?.email,
      total: registrants.filter(Boolean).length,
      registrants: registrants.filter(Boolean),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET all events (admin overview) ─────────────────────
exports.getAllEventsAdmin = async (req, res) => {
  try {
    const events = await Event.find()
      .populate("createdBy", "email role")
      .sort({ createdAt: -1 });
    res.json({ events });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Helper: convert array of objects to CSV string ──────
function toCSV(rows, fields) {
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
  };
  const header = fields.map((f) => f.label).join(",");
  const body = rows.map((row) => fields.map((f) => escape(f.value(row))).join(",")).join("\n");
  return header + "\n" + body;
}

function sendCSV(res, filename, csv) {
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

// ─── GET /api/admin/export/users ─────────────────────────
exports.exportUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } })
      .sort({ createdAt: -1 })
      .select("-password");

    const enriched = await Promise.all(users.map(async (u) => {
      const profile = u.role === "student"
        ? await StudentProfile.findOne({ user: u._id }).select("fullName branch year cgpa rollNumber")
        : await AlumniProfile.findOne({ user: u._id }).select("fullName branch graduationYear currentCompany currentRole");
      return { ...u.toObject(), profile };
    }));

    const fields = [
      { label: "Email",          value: (r) => r.email },
      { label: "Role",           value: (r) => r.role },
      { label: "Full Name",      value: (r) => r.profile?.fullName || "" },
      { label: "Branch",         value: (r) => r.profile?.branch || "" },
      { label: "Roll Number",    value: (r) => r.role === "student" ? r.profile?.rollNumber || "" : "" },
      { label: "Year",           value: (r) => r.role === "student" ? r.profile?.year || "" : "" },
      { label: "CGPA",           value: (r) => r.role === "student" ? r.profile?.cgpa || "" : "" },
      { label: "Graduation Year",value: (r) => r.role === "alumni" ? r.profile?.graduationYear || "" : "" },
      { label: "Company",        value: (r) => r.role === "alumni" ? r.profile?.currentCompany || "" : "" },
      { label: "Role/Title",     value: (r) => r.role === "alumni" ? r.profile?.currentRole || "" : "" },
      { label: "Approved",       value: (r) => r.role === "alumni" ? (r.isApproved ? "Yes" : "No") : "N/A" },
      { label: "Active",         value: (r) => r.isActive ? "Yes" : "No" },
      { label: "Joined",         value: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "" },
    ];

    sendCSV(res, `users_export_${Date.now()}.csv`, toCSV(enriched, fields));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Export failed" });
  }
};

// ─── GET /api/admin/export/mentorship ─────────────────────
exports.exportMentorship = async (req, res) => {
  try {
    const requests = await MentorshipRequest.find()
      .populate("student", "email")
      .populate("alumni", "email")
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(requests.map(async (r) => {
      const studentProfile = await StudentProfile.findOne({ user: r.student?._id }).select("fullName branch year");
      const alumniProfile  = await AlumniProfile.findOne({ user: r.alumni?._id }).select("fullName currentCompany");
      return { ...r.toObject(), studentProfile, alumniProfile };
    }));

    const fields = [
      { label: "Student Email",    value: (r) => r.student?.email || "" },
      { label: "Student Name",     value: (r) => r.studentProfile?.fullName || "" },
      { label: "Student Branch",   value: (r) => r.studentProfile?.branch || "" },
      { label: "Student Year",     value: (r) => r.studentProfile?.year || "" },
      { label: "Alumni Email",     value: (r) => r.alumni?.email || "" },
      { label: "Alumni Name",      value: (r) => r.alumniProfile?.fullName || "" },
      { label: "Alumni Company",   value: (r) => r.alumniProfile?.currentCompany || "" },
      { label: "Status",           value: (r) => r.status },
      { label: "Message",          value: (r) => r.message || "" },
      { label: "Date",             value: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "" },
    ];

    sendCSV(res, `mentorship_export_${Date.now()}.csv`, toCSV(enriched, fields));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Export failed" });
  }
};

// ─── GET /api/admin/export/events ────────────────────────
exports.exportEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .populate("createdBy", "email")
      .sort({ createdAt: -1 });

    const rows = events.map((e) => ({
      ...e.toObject(),
      registrationCount: e.registrations?.length || 0,
    }));

    const fields = [
      { label: "Title",         value: (r) => r.title },
      { label: "Category",      value: (r) => r.category },
      { label: "Mode",          value: (r) => r.mode },
      { label: "Date",          value: (r) => r.date ? new Date(r.date).toLocaleDateString("en-IN") : "" },
      { label: "Time",          value: (r) => r.time },
      { label: "Venue",         value: (r) => r.venue },
      { label: "Max Attendees", value: (r) => r.maxAttendees || "Unlimited" },
      { label: "Registrations", value: (r) => r.registrationCount },
      { label: "Created By",    value: (r) => r.createdBy?.email || "" },
      { label: "Created At",    value: (r) => r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN") : "" },
    ];

    sendCSV(res, `events_export_${Date.now()}.csv`, toCSV(rows, fields));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Export failed" });
  }
};

// ─── GET analytics data for charts ────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // ── 1. Mentorship acceptance rate over last 6 months ──
    const mentorshipByMonth = await MentorshipRequest.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Build month-by-month series
    const monthLabels = [];
    const mentorshipSeries = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(now.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthLabels.push(key);
      mentorshipSeries[key] = { month: key, total: 0, accepted: 0, acceptanceRate: 0 };
    }
    mentorshipByMonth.forEach(({ _id, count }) => {
      const key = `${_id.year}-${String(_id.month).padStart(2, "0")}`;
      if (mentorshipSeries[key]) {
        mentorshipSeries[key].total += count;
        if (_id.status === "accepted") mentorshipSeries[key].accepted += count;
      }
    });
    const mentorshipChart = Object.values(mentorshipSeries).map((m) => ({
      ...m,
      acceptanceRate: m.total > 0 ? Math.round((m.accepted / m.total) * 100) : 0,
    }));

    // ── 2. Top skills in demand (from StudentProfile.skills) ──
    const skillsAgg = await StudentProfile.aggregate([
      { $unwind: "$skills" },
      { $group: { _id: "$skills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    const topSkills = skillsAgg.map((s) => ({ skill: s._id, count: s.count }));

    // ── 3. Active alumni by graduation year ──
    const alumniByYear = await AlumniProfile.aggregate([
      { $match: { graduationYear: { $exists: true, $ne: null } } },
      { $group: { _id: "$graduationYear", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 10 },
    ]);
    const alumniChart = alumniByYear.map((a) => ({ year: String(a._id), count: a.count }));

    // ── 4. Event attendance trends (registrations per event over last 6 months) ──
    const eventStats = await Event.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      {
        $project: {
          title: 1,
          date: 1,
          attendeeCount: { $size: { $ifNull: ["$registrations", []] } },
        },
      },
      { $sort: { date: 1 } },
      { $limit: 12 },
    ]);
    const eventChart = eventStats.map((e) => ({
      title: e.title?.substring(0, 20) || "Event",
      attendees: e.attendeeCount,
      date: e.date,
    }));

    // ── 5. Alumni by branch (from AlumniProfile.branch) ──
    const alumniByBranch = await AlumniProfile.aggregate([
      { $match: { branch: { $exists: true, $ne: "" } } },
      { $group: { _id: "$branch", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);
    const branchChart = alumniByBranch.map((b) => ({ branch: b._id || "Unknown", count: b.count }));

    res.json({ mentorshipChart, topSkills, alumniChart, eventChart, branchChart });
  } catch (err) {
    console.error("[Analytics]", err);
    res.status(500).json({ message: "Server error" });
  }
};

