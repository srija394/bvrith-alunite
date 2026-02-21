import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import "./MentorshipInbox.css";

export default function MentorshipInbox() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [responding, setResponding] = useState(null);
  const [filter, setFilter] = useState("pending"); // pending | accepted | rejected | all

  useEffect(() => {
    API.get("/mentorship/requests")
      .then((res) => setRequests(res.data.requests))
      .catch(() => setError("Failed to load requests"))
      .finally(() => setLoading(false));
  }, []);

  const handleRespond = async (requestId, action) => {
    setResponding(requestId);
    try {
      await API.patch(`/mentorship/requests/${requestId}`, { action });
      setRequests((prev) =>
        prev.map((r) => (r._id === requestId ? { ...r, status: action } : r))
      );
    } catch {
      alert("Failed to respond. Please try again.");
    } finally {
      setResponding(null);
    }
  };

  const filtered = filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const counts = {
    pending: requests.filter((r) => r.status === "pending").length,
    accepted: requests.filter((r) => r.status === "accepted").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  return (
    <>
      <Navbar />
      <div className="inbox-container">
        <div className="inbox-header">
          <div>
            <h1>📬 Mentorship Requests</h1>
            <p>Students who want you as their mentor</p>
          </div>
          <button className="btn-back" onClick={() => navigate("/dashboard/alumni")}>
            ← Dashboard
          </button>
        </div>

        {/* Stats */}
        <div className="inbox-stats">
          <div className="inbox-stat pending-stat">
            <span>{counts.pending}</span>
            <p>Pending</p>
          </div>
          <div className="inbox-stat accepted-stat">
            <span>{counts.accepted}</span>
            <p>Accepted</p>
          </div>
          <div className="inbox-stat rejected-stat">
            <span>{counts.rejected}</span>
            <p>Declined</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="inbox-tabs">
          {["pending", "accepted", "rejected", "all"].map((tab) => (
            <button
              key={tab}
              className={`inbox-tab ${filter === tab ? "active" : ""}`}
              onClick={() => setFilter(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab !== "all" && counts[tab] > 0 && (
                <span className="tab-count">{counts[tab]}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="inbox-loading">Loading requests...</div>
        ) : error ? (
          <div className="inbox-error">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="inbox-empty">
            <span>📭</span>
            <p>No {filter === "all" ? "" : filter} requests yet.</p>
          </div>
        ) : (
          <div className="requests-list">
            {filtered.map((req) => (
              <RequestCard
                key={req._id}
                req={req}
                onRespond={handleRespond}
                responding={responding}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function RequestCard({ req, onRespond, responding, navigate }) {
  const profile = req.student?.profile;
  const initials = profile?.fullName
    ? profile.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "S";

  const statusColors = {
    pending: { bg: "#fef3c7", color: "#92400e", label: "⏳ Pending" },
    accepted: { bg: "#dcfce7", color: "#166534", label: "✅ Accepted" },
    rejected: { bg: "#fee2e2", color: "#991b1b", label: "❌ Declined" },
  };

  const s = statusColors[req.status];

  return (
    <div className="request-card">
      <div className="request-top">
        <div className="request-avatar">
          {profile?.profilePhoto
            ? <img src={profile.profilePhoto} alt={profile.fullName} />
            : <span>{initials}</span>
          }
        </div>

        <div className="request-info">
          <h3>{profile?.fullName || req.student?.email}</h3>
          <p className="request-sub">
            {profile
              ? `Year ${profile.year} · ${profile.branch}${profile.section ? ` · Section ${profile.section}` : ""}`
              : req.student?.email
            }
          </p>
          {profile?.skills?.length > 0 && (
            <div className="request-skills">
              {profile.skills.slice(0, 4).map((s) => (
                <span key={s} className="req-skill-chip">{s}</span>
              ))}
            </div>
          )}
        </div>

        <span
          className="request-status-badge"
          style={{ background: s.bg, color: s.color }}
        >
          {s.label}
        </span>
      </div>

      {req.message && (
        <div className="request-message">
          <span>💬</span>
          <p>"{req.message}"</p>
        </div>
      )}

      <div className="request-footer">
        <span className="request-date">
          {new Date(req.createdAt).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric"
          })}
        </span>

        <div className="request-actions">
          <button
            className="btn-view-student"
            onClick={() => navigate(`/student/${req.student?.userId}`)}
          >
            View Profile
          </button>

          {req.status === "accepted" && (
            <button
              className="btn-message"
              onClick={() => navigate(`/messages/${req.student?.userId}`)}
            >
              💬 Message
            </button>
          )}

          {req.status === "pending" && (
            <>
              <button
                className="btn-accept"
                disabled={responding === req._id}
                onClick={() => onRespond(req._id, "accepted")}
              >
                {responding === req._id ? "..." : "✓ Accept"}
              </button>
              <button
                className="btn-reject"
                disabled={responding === req._id}
                onClick={() => onRespond(req._id, "rejected")}
              >
                {responding === req._id ? "..." : "✕ Decline"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
