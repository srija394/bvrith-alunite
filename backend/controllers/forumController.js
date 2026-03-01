const ForumPost = require("../models/ForumPost");
const ForumReply = require("../models/ForumReply");
const StudentProfile = require("../models/StudentProfile");
const AlumniProfile = require("../models/AlumniProfile");

// ── Helper: get display name + role for a user ────────────
async function getAuthorInfo(user) {
  if (!user) return { name: "Unknown", role: "unknown" };
  const profile =
    user.role === "student"
      ? await StudentProfile.findOne({ user: user._id }).select("fullName")
      : user.role === "alumni"
      ? await AlumniProfile.findOne({ user: user._id }).select("fullName")
      : null;
  return {
    userId: user._id,
    email: user.email,
    role: user.role,
    name: profile?.fullName || user.email.split("@")[0],
  };
}

// ─── GET all posts ─────────────────────────────────────────
// GET /api/forum?category=career&search=resume&page=1
exports.getAllPosts = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 15 } = req.query;
    const query = {};

    if (category && category !== "all") query.category = category;
    if (search) query.$text = { $search: search };

    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      ForumPost.find(query)
        .populate("postedBy", "email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ForumPost.countDocuments(query),
    ]);

    // Attach author names
    const userId = req.user?.id;
    const enriched = await Promise.all(
      posts.map(async (p) => ({
        _id: p._id,
        title: p.title,
        content: p.content.slice(0, 150) + (p.content.length > 150 ? "..." : ""),
        category: p.category,
        views: p.views,
        replyCount: p.replyCount,
        upvoteCount: (p.upvotes || []).length,
        hasUpvoted: userId ? p.upvotes.some((id) => id.toString() === userId) : false,
        createdAt: p.createdAt,
        author: await getAuthorInfo(p.postedBy),
      }))
    );

    res.json({ posts: enriched, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST create a post ───────────────────────────────────
exports.createPost = async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title?.trim() || !content?.trim())
      return res.status(400).json({ message: "Title and content are required" });

    const post = await ForumPost.create({
      title: title.trim(),
      content: content.trim(),
      category: category || "general",
      postedBy: req.user.id,
    });

    res.status(201).json({ message: "Post created", post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET single post + all replies ───────────────────────
exports.getPost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id).populate("postedBy", "email role");
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Increment views only if user hasn't viewed before (unique views)
    const userId = req.user.id;
    if (!post.viewedBy.includes(userId)) {
      post.viewedBy.push(userId);
      post.views += 1;
      await post.save();
    }

    const replies = await ForumReply.find({ post: post._id })
      .populate("postedBy", "email role")
      .sort({ createdAt: 1 });

    // Enrich author info
    const postAuthor = await getAuthorInfo(post.postedBy);
    const enrichedReplies = await Promise.all(
      replies.map(async (r) => ({
        _id: r._id,
        content: r.content,
        createdAt: r.createdAt,
        author: await getAuthorInfo(r.postedBy),
        isOwner: r.postedBy._id.toString() === req.user.id,
      }))
    );

    res.json({
      post: {
        _id: post._id,
        title: post.title,
        content: post.content,
        category: post.category,
        views: post.views,
        replyCount: post.replyCount,
        upvoteCount: (post.upvotes || []).length,
        hasUpvoted: post.upvotes.some((id) => id.toString() === req.user.id),
        createdAt: post.createdAt,
        author: postAuthor,
        isOwner: post.postedBy._id.toString() === req.user.id,
      },
      replies: enrichedReplies,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST add a reply ─────────────────────────────────────
exports.addReply = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim())
      return res.status(400).json({ message: "Reply cannot be empty" });

    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const reply = await ForumReply.create({
      post: post._id,
      content: content.trim(),
      postedBy: req.user.id,
    });

    // Update reply count
    post.replyCount += 1;
    await post.save();

    const author = await getAuthorInfo({ _id: req.user.id, email: req.user.email, role: req.user.role });

    res.status(201).json({
      message: "Reply added",
      reply: {
        _id: reply._id,
        content: reply.content,
        createdAt: reply.createdAt,
        author,
        isOwner: true,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE a post ────────────────────────────────────────
exports.deletePost = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const isOwner = post.postedBy.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "Not authorized" });

    // Delete all replies too
    await ForumReply.deleteMany({ post: post._id });
    await post.deleteOne();

    res.json({ message: "Post deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE a reply ───────────────────────────────────────
exports.deleteReply = async (req, res) => {
  try {
    const reply = await ForumReply.findById(req.params.replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    const isOwner = reply.postedBy.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "Not authorized" });

    // Decrement reply count on post
    await ForumPost.findByIdAndUpdate(reply.post, { $inc: { replyCount: -1 } });
    await reply.deleteOne();

    res.json({ message: "Reply deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST toggle upvote ───────────────────────────────────
exports.toggleUpvote = async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user.id;
    const idx = post.upvotes.findIndex((id) => id.toString() === userId);
    if (idx === -1) {
      post.upvotes.push(userId);
    } else {
      post.upvotes.splice(idx, 1);
    }
    await post.save();

    res.json({
      upvoteCount: post.upvotes.length,
      hasUpvoted: idx === -1,   // true if just added
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
