import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import "./FindMentor.css";

export default function FindMentor() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requesting, setRequesting] = useState(null); // alumniUserId being requested
  const [message, setMessage] = useState("");
  const [activeModal, setActiveModal] = useState(null); // alumniUserId for modal

  useEffect(() => {
    API.get("/mentorship/recommendations")
      .then((res) => setRecommendations(res.data.recommendations))
      .catch((err) => setError(err.response?.data?.message || "Failed to load recommendations"))
      .finally(() => setLoading(false));
  }, []);

  const handleRequest = async (alumniUserId) => {
    setRequesting(alumniUserId);
    try {
      await API.post("/mentorship/request", { alumniUserId, message });
      // Update local state to show pending
      setRecommendations((prev) =>
        prev.map((r) =>
          r.alumniUserId?.toString() === alumniUserId?.toString()
            ? { ...r, requestStatus: "pending" }
            : r
        )
      );
      setActiveModal(null);
      setMessage("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send request");
    } finally {
      setRequesting(null);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.6) return "#16a34a";
    if (score >= 0.3) return "#d97706";
    return "#6b7280";
  };

  const getScoreLabel = (score) => {
    if (score >= 0.6) return "Excellent Match";
    if (score >= 0.3) return "Good Match";
    return "Potential Match";
  };

  return (
    <>
      <Navbar />
      <div className="mentor-container">

        {/* Header */}
        <div className="mentor-header">
          <div>
            <h1>🤖 Find a Mentor</h1>
            <p>AI-powered matches based on your skills, branch, and goals</p>
          </div>
          <button className="btn-back" onClick={() => navigate("/dashboard/student")}>
            ← Dashboard
          </button>
        </div>

        {/* How it works */}
        <div className="how-it-works">
          <span>⚡</span>
          <p>
            Our AI analyzes your profile — skills, branch, and interests — then ranks
            alumni by <strong>cosine similarity</strong> to find your best mentors.
            Only alumni who opted in for mentorship are shown.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="mentor-loading">
            <div className="ai-spinner" />
            <p>AI is finding your best mentor matches...</p>
          </div>
        ) : error ? (
          <div className="mentor-error">
            <p>{error}</p>
            {error.includes("profile") && (
              <button className="btn-primary-sm" onClick={() => navigate("/profile/create")}>
                Complete Profile
              </button>
            )}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="mentor-empty">
            <span>🔍</span>
            <p>No mentor matches found yet. Make sure alumni have completed their profiles and enabled mentorship.</p>
          </div>
        ) : (
          <div className="mentor-grid">
            {recommendations.map((rec) => (
              <MentorCard
                key={rec.alumniUserId}
                rec={rec}
                onRequest={() => setActiveModal(rec.alumniUserId)}
                navigate={navigate}
                getScoreColor={getScoreColor}
                getScoreLabel={getScoreLabel}
              />
            ))}
          </div>
        )}

        {/* Request Modal */}
        {activeModal && (
          <div className="modal-overlay" onClick={() => setActiveModal(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h2>✉️ Send Mentorship Request</h2>
              <p>Add a personal message to introduce yourself (optional)</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! I'm a 3rd year CSE student interested in full-stack development. I'd love to learn from your experience at..."
                rows={4}
                maxLength={500}
              />
              <span className="char-count">{message.length}/500</span>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => { setActiveModal(null); setMessage(""); }}>
                  Cancel
                </button>
                <button
                  className="btn-send"
                  disabled={requesting === activeModal}
                  onClick={() => handleRequest(activeModal)}
                >
                  {requesting === activeModal ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MentorCard({ rec, onRequest, navigate, getScoreColor, getScoreLabel }) {
  const { profile, matchScore, requestStatus, alumniUserId } = rec;
  const initials = profile.fullName
    ? profile.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const scorePercent = Math.round(matchScore * 100);
  const color = getScoreColor(matchScore);

  return (
    <div className="mentor-card">
      {/* Match score badge */}
      <div className="match-badge" style={{ background: color }}>
        {scorePercent}% — {getScoreLabel(matchScore)}
      </div>

      {/* Score bar */}
      <div className="score-bar-bg">
        <div
          className="score-bar-fill"
          style={{ width: `${scorePercent}%`, background: color }}
        />
      </div>

      {/* Profile info */}
      <div className="mentor-profile">
        <div className="mentor-avatar">
          {profile.profilePhoto
            ? <img src={profile.profilePhoto} alt={profile.fullName} />
            : <span>{initials}</span>
          }
        </div>
        <div className="mentor-info">
          <h3>{profile.fullName}</h3>
          <p className="mentor-role">
            {profile.currentRole
              ? `${profile.currentRole}${profile.currentCompany ? ` @ ${profile.currentCompany}` : ""}`
              : profile.currentCompany || "Alumni"
            }
          </p>
          <div className="mentor-meta">
            <span className="meta-pill">{profile.branch}</span>
            <span className="meta-pill">Batch {profile.graduationYear}</span>
            {profile.location && <span className="meta-pill">📍 {profile.location}</span>}
          </div>
        </div>
      </div>

      {/* Skills */}
      {profile.skills?.length > 0 && (
        <div className="mentor-skills">
          {profile.skills.slice(0, 5).map((s, i) => {
            const name  = typeof s === "object" ? s.name  : s;
            const level = typeof s === "object" ? s.level : null;
            return (
              <span key={i} className="skill-chip" title={level || ""}>{name}</span>
            );
          })}
          {profile.skills.length > 5 && (
            <span className="skill-chip more">+{profile.skills.length - 5}</span>
          )}
        </div>
      )}

      {/* Bio */}
      {profile.bio && (
        <p className="mentor-bio">{profile.bio.slice(0, 100)}{profile.bio.length > 100 ? "..." : ""}</p>
      )}

      {/* Actions */}
      <div className="mentor-actions">
        <button
          className="btn-view-profile"
          onClick={() => navigate(`/alumni/${alumniUserId}`)}
        >
          View Profile
        </button>

        {requestStatus === "pending" && (
          <span className="status-badge pending">⏳ Request Pending</span>
        )}
        {requestStatus === "accepted" && (
          <>
            <span className="status-badge accepted">✅ Accepted</span>
            <button className="btn-request" onClick={() => navigate(`/messages/${alumniUserId}`)}>
              💬 Message
            </button>
          </>
        )}
        {requestStatus === "rejected" && (
          <button className="btn-request" onClick={onRequest}>Re-request</button>
        )}
        {!requestStatus && (
          <button className="btn-request" onClick={onRequest}>
            Request Mentorship
          </button>
        )}
      </div>
    </div>
  );
}
