const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getAllJobs,
  getJob,
  createJob,
  updateJob,
  deleteJob,
  getMyJobs,
} = require("../controllers/jobController");

const router = express.Router();

// All logged-in users can view jobs
router.get("/", protect(["student", "alumni", "admin"]), getAllJobs);
router.get("/my", protect(["alumni"]), getMyJobs);
router.get("/:id", protect(["student", "alumni", "admin"]), getJob);

// Alumni and admin can create/manage
router.post("/", protect(["alumni", "admin"]), createJob);
router.put("/:id", protect(["alumni", "admin"]), updateJob);
router.delete("/:id", protect(["alumni", "admin"]), deleteJob);

module.exports = router;
