import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import "./Forum.css";

const CAT_COLOR = {
  career: "#0891b2", technical: "#7c3aed", placement: "#e94560",
  campus: "#16a34a", general: "#f59e0b",
};

const CAT_ICON = {
  career: "💼", technical: "💻", placement: "🎯", campus: "🏫", general: "💬",
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ForumPostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  const fetchPost = async () => {
    try {
      const { data } = await API.get(`/forum/${id}`);
      setPost(data.post);
      setReplies(data.replies);
    } catch {
      setError("Post not found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPost(); }, [id]);

  useEffect(() => {
    if (replies.length) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await API.post(`/forum/${id}/reply`, { content: replyContent.trim() });
      setReplies((r) => [...r, data.reply]);
      setReplyContent("");
      setPost((p) => ({ ...p, replyCount: p.replyCount + 1 }));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Delete this post and all its replies?")) return;
    try {
      await API.delete(`/forum/${id}`);
      navigate("/forum");
    } catch {}
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm("Delete this reply?")) return;
    try {
      await API.delete(`/forum/reply/${replyId}`);
      setReplies((r) => r.filter((x) => x._id !== replyId));
      setPost((p) => ({ ...p, replyCount: Math.max(0, p.replyCount - 1) }));
    } catch {}
  };

  if (loading) return (
    <>
      <Navbar />
      <div className="forum-container">
        <div className="forum-loading"><div className="forum-spinner" /><p>Loading...</p></div>
      </div>
    </>
  );

  if (error || !post) return (
    <>
      <Navbar />
      <div className="forum-container">
        <div className="forum-empty"><p>❌ {error || "Post not found"}</p>
          <button className="btn-back-forum" onClick={() => navigate("/forum")}>← Back to Forum</button>
        </div>
      </div>
    </>
  );

  const catColor = CAT_COLOR[post.category] || "#888";

  return (
    <>
      <Navbar />
      <div className="forum-container">
        {/* Back */}
        <button className="btn-back-forum" onClick={() => navigate("/forum")}>← Back to Forum</button>

        {/* Post */}
        <div className="post-full-card">
          <div className="post-full-header">
            <div className="post-full-meta-top">
              <span className="cat-badge" style={{ background: catColor + "18", color: catColor }}>
                {CAT_ICON[post.category]} {post.category}
              </span>
              <div className="post-stats-row">
                <span>👁 {post.views} views</span>
                <span>💬 {post.replyCount} replies</span>
              </div>
            </div>
            <h1 className="post-full-title">{post.title}</h1>
            <div className="post-author-row">
              <div className={`author-avatar ${post.author.role}`}>
                {post.author.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="author-name-full">{post.author.name}</span>
                <span className={`author-role-pill ${post.author.role}`}>{post.author.role}</span>
                <span className="post-time-full">· {timeAgo(post.createdAt)}</span>
              </div>
              {(post.isOwner || user?.role === "admin") && (
                <button className="btn-delete-post" onClick={handleDeletePost}>🗑️ Delete</button>
              )}
            </div>
          </div>
          <div className="post-full-content">{post.content}</div>
        </div>

        {/* Replies */}
        <div className="replies-section">
          <h3 className="replies-heading">
            {replies.length === 0 ? "No replies yet — be the first!" : `${replies.length} ${replies.length === 1 ? "Reply" : "Replies"}`}
          </h3>

          {replies.map((reply, idx) => (
            <div key={reply._id} className={`reply-card ${reply.author.role === "alumni" ? "alumni-reply" : ""}`}>
              <div className="reply-header">
                <div className="reply-author-row">
                  <div className={`author-avatar small ${reply.author.role}`}>
                    {reply.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="author-name-full">{reply.author.name}</span>
                    <span className={`author-role-pill ${reply.author.role}`}>{reply.author.role}</span>
                    <span className="post-time-full">· {timeAgo(reply.createdAt)}</span>
                  </div>
                </div>
                {(reply.isOwner || user?.role === "admin") && (
                  <button className="btn-delete-reply" onClick={() => handleDeleteReply(reply._id)}>🗑️</button>
                )}
              </div>
              <p className="reply-content">{reply.content}</p>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Reply Input */}
        <div className="reply-form-card">
          <h3>Your Reply</h3>
          {error && <div className="forum-error">{error}</div>}
          <form onSubmit={handleReply}>
            <textarea
              className="forum-textarea"
              placeholder="Share your answer, experience or advice..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={4}
              maxLength={2000}
              required
            />
            <div className="reply-form-footer">
              <span className="char-count">{replyContent.length}/2000</span>
              <button type="submit" className="btn-submit-post" disabled={submitting || !replyContent.trim()}>
                {submitting ? "Posting..." : "Post Reply"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
