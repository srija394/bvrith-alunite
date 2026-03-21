// backend/controllers/jobController.js
const Job = require("../models/Job");
const User = require("../models/User");
const AlumniProfile = require("../models/AlumniProfile");
const { runJobMatching } = require("../utils/jobMatchingEngine");
const { createNotification } = require("../utils/notificationHelper");
const emailService = require("../utils/emailService");

// ─── Helpers ─────────────────────────────────────────────────────────
async function enrichWithPosterName(job) {
  const ap = await AlumniProfile.findOne({ user: job.postedBy._id || job.postedBy }).select("fullName currentRole");
  return {
    ...(job.toObject ? job.toObject() : job),
    posterName: ap?.fullName || job.postedBy?.email || "",
    posterRole: ap?.currentRole || "",
  };
}

function normaliseSkills(raw) {
  if (!Array.isArray(raw)) return [];
  // Accept either plain strings or legacy {name,level} objects — store as plain strings
  return raw.map((s) =>
    typeof s === "string" ? s.trim() : (s.name || "").trim()
  ).filter(Boolean);
}

// ─── GET all jobs ─────────────────────────────────────────────────────
exports.getAllJobs = async (req, res) => {
  try {
    const { type = "", mode = "", search = "", page = 1, limit = 12 } = req.query;
    const query = { isActive: true };
    if (type) query.type = type;
    if (mode) query.mode = mode;
    if (search.trim()) {
      const r = new RegExp(search.trim(), "i");
      query.$or = [{ title: r }, { company: r }, { description: r }];
    }
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const [jobs, total] = await Promise.all([
      Job.find(query).populate("postedBy", "email").sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Job.countDocuments(query),
    ]);
    const enriched = await Promise.all(jobs.map(enrichWithPosterName));
    res.json({ jobs: enriched, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET single job ───────────────────────────────────────────────────
exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("postedBy", "email");
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ job: await enrichWithPosterName(job) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST create job ──────────────────────────────────────────────────
exports.createJob = async (req, res) => {
  try {
    const { title, company, type, location, mode, description, skillsRequired, stipend, salary, duration, applyLink, deadline } = req.body;
    if (!title || !company || !type || !description) {
      return res.status(400).json({ message: "Title, company, type and description are required" });
    }
    const job = await Job.create({
      title, company, type, location, mode, description,
      skillsRequired: normaliseSkills(skillsRequired),
      stipend, salary, duration, applyLink,
      deadline: deadline || null,
      postedBy: req.user.id,
    });
    res.status(201).json({ message: "Job posted successfully", job });
    // Background: match + notify
    _runMatchingAndNotify(job).catch((e) => console.error("[jobController] matching failed:", e.message));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET matched students (poster / admin) ────────────────────────────
exports.getMatchedStudents = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).select("matchedStudents title company postedBy skillsRequired");
    if (!job) return res.status(404).json({ message: "Job not found" });
    const isOwner = job.postedBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorised to view matched candidates" });
    }
    res.json({ jobId: job._id, jobTitle: job.title, skillsRequired: job.skillsRequired, matchedStudents: job.matchedStudents, totalMatched: job.matchedStudents.length });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST re-run matching (admin) ─────────────────────────────────────
exports.rerunMatching = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    const matched = await runJobMatching(job);
    job.matchedStudents = matched;
    await job.save();
    res.json({ message: "Matching re-run successfully", totalMatched: matched.length });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PUT update job ───────────────────────────────────────────────────
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    const isOwner = job.postedBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== "admin") return res.status(403).json({ message: "Not authorized" });
    const allowed = ["title","company","type","location","mode","description","skillsRequired","stipend","salary","duration","applyLink","deadline","isActive"];
    allowed.forEach((f) => { if (req.body[f] !== undefined) job[f] = req.body[f]; });
    if (req.body.skillsRequired !== undefined) job.skillsRequired = normaliseSkills(req.body.skillsRequired);
    await job.save();
    res.json({ message: "Job updated", job });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE job ───────────────────────────────────────────────────────
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    const isOwner = job.postedBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== "admin") return res.status(403).json({ message: "Not authorized" });
    await job.deleteOne();
    res.json({ message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET my posted jobs (alumni) ──────────────────────────────────────
exports.getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Internal: run matching and notify ────────────────────────────────
async function _runMatchingAndNotify(job) {
  const matched = await runJobMatching(job);
  if (matched.length === 0) return;
  job.matchedStudents = matched;
  await job.save();

  const userDocs = await User.find({ _id: { $in: matched.map((m) => m.studentId) } }).select("_id email isActive").lean();
  const userEmailMap = new Map(userDocs.map((u) => [u._id.toString(), u.email]));

  for (const candidate of matched) {
    const userId = candidate.studentId.toString();
    const email = userEmailMap.get(userId);
    try {
      await createNotification(
        userId, "job",
        `💼 Your skills match "${job.title}" at ${job.company}! You matched ${candidate.matchedCount} required skill${candidate.matchedCount !== 1 ? "s" : ""}. Check Jobs & Internships to apply.`,
        `/jobs/${job._id}`
      );
      if (email) {
        await emailService.sendJobMatchEmail(email, candidate.fullName, job.title, job.company, candidate.matchedCount, job._id.toString());
      }
    } catch (e) {
      console.error(`[jobMatching] notify failed for ${userId}:`, e.message);
    }
  }
  console.log(`[jobMatching] Matched ${matched.length} students for "${job.title}" (${job._id})`);
}
