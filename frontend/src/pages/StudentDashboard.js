import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const STATS = [
  { icon: "📚", label: "Courses Enrolled", value: "6" },
  { icon: "📝", label: "Assignments Due", value: "3" },
  { icon: "🏆", label: "CGPA", value: "8.7" },
  { icon: "🤝", label: "Alumni Connections", value: "12" },
];

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const QUICK_LINKS = [
    { icon: "🤖", label: "Find a Mentor", desc: "AI-matched mentors based on your skills & goals", path: "/mentorship/find", highlight: true },
    { icon: "💬", label: "Messages", desc: "Chat with your mentors and alumni", path: "/messages", highlight: true },
    { icon: "🎓", label: "Alumni Directory", desc: "Search and connect with BVRITH graduates", path: "/alumni/directory" },
    { icon: "🗓️", label: "Events", desc: "Upcoming college talks, workshops & reunions", path: "/events" },
  ];

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <header className="dashboard-header student">
          <div>
            <h1>👋 Hello, Student!</h1>
            <p>{user?.email} &mdash; Your campus portal is ready.</p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button className="header-profile-btn" onClick={() => navigate("/profile/view")}>👤 My Profile</button>
            <div className="header-badge">Student Portal</div>
          </div>
        </header>
        <section className="stats-grid">
          {STATS.map((s) => (
            <div key={s.label} className="stat-card">
              <span className="stat-icon">{s.icon}</span>
              <div><div className="stat-value">{s.value}</div><div className="stat-label">{s.label}</div></div>
            </div>
          ))}
        </section>
        <h2 className="section-title">Quick Links</h2>
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
