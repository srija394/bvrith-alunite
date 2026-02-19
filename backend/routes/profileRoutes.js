const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getMyProfile,
  createProfile,
  updateProfile,
  getProfileById,
  getAllAlumni,
  getAllStudents,
} = require("../controllers/profileController");

const router = express.Router();

// My profile (student or alumni)
router.get("/me", protect(["student", "alumni"]), getMyProfile);
router.post("/me", protect(["student", "alumni"]), createProfile);
router.put("/me", protect(["student", "alumni"]), updateProfile);

// Public: view any profile by userId + role
router.get("/:role/:id", getProfileById);

// Directory
router.get("/alumni/all", getAllAlumni); // public - alumni directory
router.get("/students/all", protect(["admin"]), getAllStudents); // admin only

module.exports = router;
