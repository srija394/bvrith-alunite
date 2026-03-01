const express = require("express");
const { protect, requireApproved } = require("../middleware/authMiddleware");
const {
  getAllPosts,
  createPost,
  getPost,
  addReply,
  deletePost,
  deleteReply,
} = require("../controllers/forumController");

const router = express.Router();
const auth = protect(["student", "alumni", "admin"]);

// Read — allowed even for unapproved alumni
router.get("/", auth, getAllPosts);
router.get("/:id", auth, getPost);

// Write — alumni must be approved
router.post("/", auth, requireApproved, createPost);
router.post("/:id/reply", auth, requireApproved, addReply);
router.delete("/:id", auth, requireApproved, deletePost);
router.delete("/reply/:replyId", auth, requireApproved, deleteReply);

module.exports = router;
