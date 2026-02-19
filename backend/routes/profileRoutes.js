const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getMyProfile,
  createProfile,
  updateProfile,
  getProfileById,
  getAllAlumni,
  getAllStudents,
  getAlumniFilterOptions,
} = require("../controllers/profileController");

const router = express.Router();

// My profile (student or alumni)
router.get("/me", protect(["student", "alumni"]), getMyProfile);
router.post("/me", protect(["student", "alumni"]), createProfile);
router.put("/me", protect(["student", "alumni"]), updateProfile);

// Alumni directory - search, filter, paginate (public)
router.get("/alumni/all", getAllAlumni);
router.get("/alumni/filters", getAlumniFilterOptions);

// Admin only
router.get("/students/all", protect(["admin"]), getAllStudents);

// Public: view any profile by userId + role (keep LAST to avoid route conflicts)
router.get("/:role/:id", getProfileById);

module.exports = router;