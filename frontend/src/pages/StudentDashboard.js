import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import "./Dashboard.css";

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [stats, setStats] = useState({
    cgpa: null,
    graduationYear: null,
    mentorshipsSent: 0,
    alumniConnections: 0,
  });

  useEffect(() => {
    // Fetch announcements
    API.get("/admin/announcements?role=student")
      .then((r) => setAnnouncements(r.data.announcements.slice(0, 3)))
      .catch(() => {});

    // Fetch real stats
    Promise.all([
      API.get("/profile/me").catch(() => null),
      API.get("/mentorship/my-sent-requests").catch(() => null),
    ]).then(([profileRes, mentorshipRes]) => {
      const profile = profileRes?.data?.profile;
      const requests = mentorshipRes?.data?.requests || [];
      const accepted = requests.filter((r) => r.status === "accepted").length;
      setStats({
        cgpa: profile?.cgpa ?? null,
        graduationYear: profile?.graduationYear ?? null,
        mentorshipsSent: requests.length,
        alumniConnections: accepted,
      });
    });
  }, []);

  const STATS = [
    { icon: "🏆", label: "CGPA", value: stats.cgpa !== null ? stats.cgpa.toFixed(1) : "Not set" },
    { icon: "🎓", label: "Graduation Year", value: stats.graduationYear ?? "Not set" },
    { icon: "📤", label: "Mentorship Requests", value: stats.mentorshipsSent },
    { icon: "🤝", label: "Alumni Connections", value: stats.alumniConnections },
  ];

  const QUICK_LINKS = [
    { icon: "🤖", label: "Find a Mentor", desc: "AI-matched mentors based on your skills & goals", path: "/mentorship/find", highlight: true },
    { icon: "💬", label: "Messages", desc: "Chat with your mentors and alumni", path: "/messages", highlight: true },
    { icon: "🎓", label: "Alumni Directory", desc: "Search and connect with BVRITH graduates", path: "/alumni/directory" },
    { icon: "🗓️", label: "Events", desc: "Upcoming college talks, workshops & reunions", path: "/events" },
    { icon: "🗨️", label: "Discussion Forum", desc: "Ask questions, get answers from alumni", path: "/forum" },
    { icon: "📁", label: "My Files", desc: "Resume, certificates and documents", path: "/my-files" },
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
                <div className="stat-value">{s.value}</div>
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
                className={`link-card ${l.highlight ? "highlight" : ""}`}
                onClick={() => navigate(l.path)}
              >
                <span className="link-icon">{l.icon}</span>
                <div>
                  <div className="link-label">{l.label}</div>
                  <div className="link-desc">{l.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
