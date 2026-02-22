import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import "./Dashboard.css";

const STATS = [
  { icon: "🎓", label: "Graduation Year", value: "2022" },
  { icon: "👥", label: "Mentees", value: "5" },
  { icon: "💡", label: "Jobs Posted", value: "2" },
  { icon: "🌐", label: "Network Size", value: "148" },
];

export default function AlumniDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    API.get("/admin/announcements?role=alumni").then((r) => {
      setAnnouncements(r.data.announcements.slice(0, 3));
    }).catch(() => {});
  }, []);

  const QUICK_LINKS = [
    { icon: "📬", label: "Mentorship Requests", desc: "View and respond to student requests", path: "/mentorship/inbox", highlight: true },
    { icon: "💬", label: "Messages", desc: "Chat with students you're mentoring", path: "/messages", highlight: true },
    { icon: "🗓️", label: "Events", desc: "Create and manage college events", path: "/events" },
    { icon: "🎓", label: "Alumni Directory", desc: "Browse and connect with fellow graduates", path: "/alumni/directory" },
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
            <button className="header-profile-btn" onClick={() => navigate("/profile/view")}>👤 My Profile</button>
            <div className="header-badge alumni-badge">Alumni Portal</div>
          </div>
        </header>

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
              <div><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
            </div>
          ))}
        </section>
        <h2 className="section-title">What would you like to do?</h2>
        <section className="links-grid">
          {QUICK_LINKS.map((l) => (
            <div key={l.label} className={`link-card ${l.highlight ? "highlight-card" : ""}`}
              onClick={() => l.path && navigate(l.path)} style={{ cursor: l.path ? "pointer" : "default" }}>
              <span className="link-icon">{l.icon}</span>
              <div><strong>{l.label}</strong><p>{l.desc}</p></div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
