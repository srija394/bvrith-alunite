const express = require("express");
const { protect } = require("../middleware/authMiddleware");
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

router.get("/", auth, getAllPosts);
router.post("/", auth, createPost);
router.get("/:id", auth, getPost);
router.post("/:id/reply", auth, addReply);
router.delete("/:id", auth, deletePost);
router.delete("/reply/:replyId", auth, deleteReply);

module.exports = router;
