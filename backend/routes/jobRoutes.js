const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getAllJobs, getJob, createJob, updateJob, deleteJob, getMyJobs,
  getMatchedStudents, rerunMatching,
} = require("../controllers/jobController");

const router = express.Router();

router.get("/", protect(["student", "alumni", "admin"]), getAllJobs);
router.get("/my", protect(["alumni"]), getMyJobs);
router.get("/:id", protect(["student", "alumni", "admin"]), getJob);

router.post("/", protect(["alumni", "admin"]), createJob);
router.put("/:id", protect(["alumni", "admin"]), updateJob);
router.delete("/:id", protect(["alumni", "admin"]), deleteJob);

// Skill-matching
router.get("/:id/matches", protect(["alumni", "admin"]), getMatchedStudents);
router.post("/:id/matches/rerun", protect(["admin"]), rerunMatching);

module.exports = router;
