import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import ClickableName from "../components/ClickableName";
import "./Forum.css";

const CATEGORIES = [
  { value: "all", label: "All", icon: "🌐" },
  { value: "career", label: "Career", icon: "💼" },
  { value: "technical", label: "Technical", icon: "💻" },
  { value: "placement", label: "Placement", icon: "🎯" },
  { value: "campus", label: "Campus", icon: "🏫" },
  { value: "general", label: "General", icon: "💬" },
];

const CAT_COLOR = {
  career: "#0891b2", technical: "#7c3aed", placement: "#e94560",
  campus: "#16a34a", general: "#f59e0b",
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ForumPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "general" });
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (category !== "all") params.set("category", category);
      if (search) params.set("search", search);
      const { data } = await API.get(`/forum?${params}`);
      setPosts(data.posts);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, [category, search, page]);

  const handleUpvote = async (postId) => {
    try {
      const { data } = await API.post(`/forum/${postId}/upvote`);
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, upvoteCount: data.upvoteCount, hasUpvoted: data.hasUpvoted }
            : p
        )
      );
    } catch {}
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setPosting(true); setError("");
    try {
      await API.post("/forum", form);
      setForm({ title: "", content: "", category: "general" });
      setShowForm(false);
      setPage(1);
      fetchPosts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post");
    } finally { setPosting(false); }
  };

  return (
    <>
      <Navbar />
      <div className="forum-container">
        {/* Header */}
        <div className="forum-header">
          <div>
            <h1>💬 Discussion Forum</h1>
            <p>Ask questions, share knowledge — open to all students, alumni and admin</p>
          </div>
          <button className="btn-new-post" onClick={() => setShowForm((s) => !s)}>
            {showForm ? "✕ Cancel" : "+ New Post"}
          </button>
        </div>

        {/* New Post Form */}
        {showForm && (
          <div className="new-post-card">
            <h3>Create a New Post</h3>
            {error && <div className="forum-error">{error}</div>}
            <form onSubmit={handlePost}>
              <input
                className="forum-input"
                placeholder="Title — e.g. How do I prepare for TCS NQT?"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                maxLength={200}
              />
              <textarea
                className="forum-textarea"
                placeholder="Describe your question or topic in detail..."
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                required
                rows={5}
                maxLength={5000}
              />
              <div className="form-bottom-row">
                <select
                  className="forum-select"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
                <button type="submit" className="btn-submit-post" disabled={posting}>
                  {posting ? "Posting..." : "Post Question"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters + Search */}
        <div className="forum-toolbar">
          <div className="category-tabs">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                className={`cat-tab ${category === c.value ? "active" : ""}`}
                style={category === c.value && c.value !== "all" ? { borderColor: CAT_COLOR[c.value], color: CAT_COLOR[c.value] } : {}}
                onClick={() => { setCategory(c.value); setPage(1); }}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSearch} className="forum-search-form">
            <input
              className="forum-search-input"
              placeholder="Search posts..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn-search">Search</button>
          </form>
        </div>

        {/* Stats */}
        <div className="forum-stats">
          <span>{total} {total === 1 ? "post" : "posts"}{category !== "all" ? ` in ${category}` : ""}</span>
        </div>

        {/* Post List */}
        {loading ? (
          <div className="forum-loading"><div className="forum-spinner" /><p>Loading posts...</p></div>
        ) : posts.length === 0 ? (
          <div className="forum-empty">
            <p>🔍 No posts found.</p>
            <p>Be the first to ask a question!</p>
          </div>
        ) : (
          <div className="posts-list">
            {posts.map((post) => (
              <div
                key={post._id}
                className="post-card"
                onClick={() => navigate(`/forum/${post._id}`)}
              >
                <div className="post-card-left">
                  <span
                    className="cat-badge"
                    style={{ background: (CAT_COLOR[post.category] || "#888") + "18", color: CAT_COLOR[post.category] || "#888" }}
                  >
                    {CATEGORIES.find((c) => c.value === post.category)?.icon} {post.category}
                  </span>
                  <h3 className="post-title">{post.title}</h3>
                  <p className="post-preview">{post.content}</p>
                  <div className="post-meta">
                    <span className={`author-role ${post.author.role}`}>{post.author.role}</span>
                    <ClickableName name={post.author.name} userId={post.author.userId} role={post.author.role} />
                    <span className="post-time">· {timeAgo(post.createdAt)}</span>
                  </div>
                </div>
                <div className="post-card-right">
                  <button
                    className={`upvote-btn${post.hasUpvoted ? " upvoted" : ""}`}
                    onClick={(e) => { e.stopPropagation(); handleUpvote(post._id); }}
                    title={post.hasUpvoted ? "Remove upvote" : "Upvote"}
                  >
                    ▲ <span>{post.upvoteCount || 0}</span>
                  </button>
                  <div className="post-stat">
                    <span className="stat-num">{post.replyCount}</span>
                    <span className="stat-label">replies</span>
                  </div>
                  <div className="post-stat">
                    <span className="stat-num">{post.views}</span>
                    <span className="stat-label">views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="forum-pagination">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-page">← Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-page">Next →</button>
          </div>
        )}
      </div>
    </>
  );
}