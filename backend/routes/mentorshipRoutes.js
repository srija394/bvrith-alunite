const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getRecommendations,
  sendRequest,
  getMyRequests,
  respondToRequest,
  getMySentRequests,
} = require("../controllers/mentorshipController");

const router = express.Router();

// Student routes
router.get("/recommendations", protect(["student"]), getRecommendations);
router.post("/request", protect(["student"]), sendRequest);
router.get("/sent", protect(["student"]), getMySentRequests);

// Alumni routes
router.get("/requests", protect(["alumni"]), getMyRequests);
router.patch("/requests/:requestId", protect(["alumni"]), respondToRequest);

module.exports = router;
