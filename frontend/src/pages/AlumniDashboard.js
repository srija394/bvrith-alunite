import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import "./Dashboard.css";

export default function AlumniDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({
    graduationYear: null,
    mentees: 0,
    pendingRequests: 0,
    totalRequests: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const isApproved = user?.isApproved;

  const fetchStats = useCallback(() => {
    Promise.all([
      API.get("/profile/me").catch(() => null),
      isApproved ? API.get("/mentorship/requests").catch(() => null) : Promise.resolve(null),
    ]).then(([profileRes, mentorshipRes]) => {
      const profile  = profileRes?.data?.profile;
      const requests = mentorshipRes?.data?.requests || [];
      const accepted = requests.filter((r) => r.status === "accepted").length;
      const pending  = requests.filter((r) => r.status === "pending").length;
      setStats({
        graduationYear: profile?.graduationYear ?? null,
        mentees:        accepted,
        pendingRequests: pending,
        totalRequests:  requests.length,
      });
    }).finally(() => setStatsLoading(false));
  }, [isApproved]);

  useEffect(() => {
    API.get("/admin/announcements?role=alumni")
      .then((r) => setAnnouncements(r.data.announcements.slice(0, 3)))
      .catch(() => {});

    fetchStats();

    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const STATS = [
    { icon: "🎓", label: "Graduation Year",    value: stats.graduationYear ?? "Not set" },
    { icon: "👥", label: "Active Mentees",     value: isApproved ? stats.mentees : "—" },
    { icon: "📬", label: "Pending Requests",   value: isApproved ? stats.pendingRequests : "—" },
    { icon: "📊", label: "Total Requests",     value: isApproved ? stats.totalRequests : "—" },
  ];

  const QUICK_LINKS = [
    { icon: "📬", label: "Mentorship Requests", desc: "View and respond to student requests",            path: "/mentorship/inbox", highlight: true,  locked: !isApproved },
    { icon: "💬", label: "Messages",            desc: "Chat with students you're mentoring",             path: "/messages",         highlight: true,  locked: !isApproved },
    { icon: "🗓️", label: "Events",             desc: "Create and manage college events",                path: "/events",                             locked: !isApproved },
    { icon: "🗨️", label: "Discussion Forum",   desc: "Answer student questions and share knowledge",    path: "/forum",                              locked: !isApproved },
    { icon: "🎓", label: "Alumni Directory",    desc: "Browse and connect with fellow graduates",        path: "/alumni/directory",                   locked: !isApproved },
    { icon: "📁", label: "My Files",            desc: "Resume, certificates and documents",              path: "/my-files" },
  ];

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <header className="dashboard-header alumni">
          <div>
            <h1>👋 Welcome Back, Alumni!</h1>
            <p>{user?.email} &mdash; Stay connected with BVRITH.</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button className="header-profile-btn" onClick={fetchStats} title="Refresh stats">🔄</button>
            <button className="header-profile-btn" onClick={() => navigate("/profile/view")}>👤 My Profile</button>
            <div className="header-badge alumni-badge">Alumni Portal</div>
          </div>
        </header>

        {/* Pending Approval Banner */}
        {!isApproved && (
          <div style={{
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            borderRadius: "10px",
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
          }}>
            <span style={{ fontSize: "1.5rem" }}>⏳</span>
            <div>
              <strong style={{ color: "#92400e" }}>Account Pending Approval</strong>
              <p style={{ margin: "0.25rem 0 0", color: "#78350f", fontSize: "0.9rem" }}>
                Your alumni account is awaiting admin approval. Once approved, you will have full access to mentorship requests, events, directory, messages, and forum features.
                In the meantime, you can complete your profile and upload your graduation documents to speed up the review.
              </p>
            </div>
          </div>
        )}

        {announcements.length > 0 && (
          <section className="announcements-preview">
            <h2 className="section-title">📣 Announcements</h2>
            {announcements.map((a) => (
              <div key={a._id} className={`announcement-preview-card ${a.pinned ? "pinned" : ""}`}>
                {a.pinned && <span className="pin-dot">📌</span>}
                <strong>{a.title}</strong>
                <p>{a.content.slice(0, 120)}{a.content.length > 120 ? "..." : ""}</p>
              </div>
            ))}
          </section>
        )}

        <section className="stats-grid">
          {STATS.map((s) => (
            <div key={s.label} className="stat-card">
              <span className="stat-icon">{s.icon}</span>
              <div>
                <div className="stat-value">
                  {statsLoading ? <span className="stat-loading">…</span> : s.value}
                </div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="quick-links-grid">
          <h2 className="section-title">Quick Access</h2>
          <div className="links-grid">
            {QUICK_LINKS.map((l) => (
              <div
                key={l.label}
                className={`link-card ${l.highlight ? "highlight" : ""} ${l.locked ? "locked" : ""}`}
                onClick={() => !l.locked && navigate(l.path)}
                style={l.locked ? { opacity: 0.5, cursor: "not-allowed", position: "relative" } : {}}
                title={l.locked ? "Available after admin approval" : undefined}
              >
                <span className="link-icon">{l.locked ? "🔒" : l.icon}</span>
                <div>
                  <div className="link-label">{l.label}</div>
                  <div className="link-desc">{l.locked ? "Requires admin approval" : l.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
