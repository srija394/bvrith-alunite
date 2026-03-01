const Job = require("../models/Job");
const AlumniProfile = require("../models/AlumniProfile");

// ─── GET all jobs with filters & pagination ───────────────
exports.getAllJobs = async (req, res) => {
  try {
    const {
      type = "",
      mode = "",
      search = "",
      page = 1,
      limit = 12,
    } = req.query;

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
      Job.find(query)
        .populate("postedBy", "email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Job.countDocuments(query),
    ]);

    // Attach poster's alumni profile name
    const enriched = await Promise.all(
      jobs.map(async (j) => {
        const alumniProfile = await AlumniProfile.findOne({ user: j.postedBy._id }).select("fullName");
        return { ...j.toObject(), posterName: alumniProfile?.fullName || j.postedBy.email };
      })
    );

    res.json({
      jobs: enriched,
      pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET single job ───────────────────────────────────────
exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate("postedBy", "email");
    if (!job) return res.status(404).json({ message: "Job not found" });

    const alumniProfile = await AlumniProfile.findOne({ user: job.postedBy._id }).select("fullName currentRole");
    res.json({ job: { ...job.toObject(), posterName: alumniProfile?.fullName || job.postedBy.email, posterRole: alumniProfile?.currentRole } });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST create job (alumni only) ───────────────────────
exports.createJob = async (req, res) => {
  try {
    const { title, company, type, location, mode, description, skillsRequired, stipend, salary, duration, applyLink, deadline } = req.body;

    if (!title || !company || !type || !description) {
      return res.status(400).json({ message: "Title, company, type and description are required" });
    }

    const job = await Job.create({
      title, company, type, location, mode, description,
      skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : [],
      stipend, salary, duration, applyLink, deadline: deadline || null,
      postedBy: req.user.id,
    });

    res.status(201).json({ message: "Job posted successfully", job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PUT update job (owner or admin) ─────────────────────
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const isOwner = job.postedBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const allowed = ["title","company","type","location","mode","description","skillsRequired","stipend","salary","duration","applyLink","deadline","isActive"];
    allowed.forEach((f) => { if (req.body[f] !== undefined) job[f] = req.body[f]; });
    await job.save();

    res.json({ message: "Job updated", job });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE job (owner or admin) ─────────────────────────
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const isOwner = job.postedBy.toString() === req.user.id;
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await job.deleteOne();
    res.json({ message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET my posted jobs (alumni) ─────────────────────────
exports.getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.id }).sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
