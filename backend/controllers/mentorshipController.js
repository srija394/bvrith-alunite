const StudentProfile = require("../models/StudentProfile");
const AlumniProfile = require("../models/AlumniProfile");
const MentorshipRequest = require("../models/MentorshipRequest");
const { rankMentors } = require("../utils/matchingEngine");

// ─── GET recommended mentors for logged-in student ────────
exports.getRecommendations = async (req, res) => {
  try {
    // Get the student's own profile
    const studentProfile = await StudentProfile.findOne({ user: req.user.id });
    if (!studentProfile) {
      return res.status(400).json({
        message: "Please complete your profile first to get mentor recommendations.",
      });
    }

    // Get all alumni profiles
    const allAlumni = await AlumniProfile.find()
      .populate("user", "email _id");

    if (allAlumni.length === 0) {
      return res.json({ recommendations: [] });
    }

    // Run AI matching
    const ranked = rankMentors(studentProfile, allAlumni, 10);

    // Attach existing request status for each alumni
    const alumniUserIds = ranked.map((r) => r.alumni.user?._id || r.alumni.user);
    const existingRequests = await MentorshipRequest.find({
      student: req.user.id,
      alumni: { $in: alumniUserIds },
    });

    const requestMap = {};
    existingRequests.forEach((r) => {
      requestMap[r.alumni.toString()] = r.status;
    });

    const recommendations = ranked.map(({ alumni, matchScore }) => ({
      alumniUserId: alumni.user?._id || alumni.user,
      profile: alumni,
      matchScore,
      requestStatus: requestMap[(alumni.user?._id || alumni.user).toString()] || null,
    }));

    res.json({ recommendations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST send a mentorship request ───────────────────────
exports.sendRequest = async (req, res) => {
  try {
    const { alumniUserId, message = "" } = req.body;

    // Check alumni exists and is available
    const alumniProfile = await AlumniProfile.findOne({ user: alumniUserId });
    if (!alumniProfile) {
      return res.status(404).json({ message: "Alumni not found" });
    }
    if (!alumniProfile.isAvailableForMentorship) {
      return res.status(400).json({ message: "This alumni is not available for mentorship" });
    }

    // Check student profile exists
    const studentProfile = await StudentProfile.findOne({ user: req.user.id });
    if (!studentProfile) {
      return res.status(400).json({ message: "Complete your profile before sending requests" });
    }

    // Upsert — if rejected before, allow re-request
    const request = await MentorshipRequest.findOneAndUpdate(
      { student: req.user.id, alumni: alumniUserId },
      { status: "pending", message },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ message: "Mentorship request sent!", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET all requests for logged-in alumni ─────────────────
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await MentorshipRequest.find({ alumni: req.user.id })
      .populate("student", "email _id")
      .sort({ createdAt: -1 });

    // Enrich with student profiles
    const enriched = await Promise.all(
      requests.map(async (r) => {
        const studentProfile = await StudentProfile.findOne({ user: r.student._id });
        return {
          _id: r._id,
          status: r.status,
          message: r.message,
          matchScore: r.matchScore,
          createdAt: r.createdAt,
          student: {
            userId: r.student._id,
            email: r.student.email,
            profile: studentProfile,
          },
        };
      })
    );

    res.json({ requests: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PATCH accept or reject a request ─────────────────────
exports.respondToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // "accepted" or "rejected"

    if (!["accepted", "rejected"].includes(action)) {
      return res.status(400).json({ message: "Action must be 'accepted' or 'rejected'" });
    }

    const request = await MentorshipRequest.findOne({
      _id: requestId,
      alumni: req.user.id,
    });

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = action;
    await request.save();

    res.json({ message: `Request ${action}`, request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET student's sent requests + their statuses ─────────
exports.getMySentRequests = async (req, res) => {
  try {
    const requests = await MentorshipRequest.find({ student: req.user.id })
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      requests.map(async (r) => {
        const alumniProfile = await AlumniProfile.findOne({ user: r.alumni });
        return {
          _id: r._id,
          status: r.status,
          message: r.message,
          matchScore: r.matchScore,
          createdAt: r.createdAt,
          alumni: { userId: r.alumni, profile: alumniProfile },
        };
      })
    );

    res.json({ requests: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
