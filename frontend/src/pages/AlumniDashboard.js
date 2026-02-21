import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
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

  const QUICK_LINKS = [
    { icon: "📬", label: "Mentorship Requests", desc: "View and respond to student mentorship requests", path: "/mentorship/inbox", highlight: true },
    { icon: "💬", label: "Messages", desc: "Chat with students you're mentoring", path: "/messages", highlight: true },
    { icon: "🎓", label: "Alumni Directory", desc: "Browse and connect with fellow graduates", path: "/alumni/directory" },
    { icon: "📢", label: "Post a Job / Internship", desc: "Help juniors find opportunities", path: null },
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

        <section className="stats-grid">
          {STATS.map((s) => (
            <div key={s.label} className="stat-card">
              <span className="stat-icon">{s.icon}</span>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </section>

        <h2 className="section-title">What would you like to do?</h2>
        <section className="links-grid">
          {QUICK_LINKS.map((l) => (
            <div
              key={l.label}
              className={`link-card ${l.highlight ? "highlight-card" : ""}`}
              onClick={() => l.path && navigate(l.path)}
              style={{ cursor: l.path ? "pointer" : "default" }}
            >
              <span className="link-icon">{l.icon}</span>
              <div>
                <strong>{l.label}</strong>
                <p>{l.desc}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
