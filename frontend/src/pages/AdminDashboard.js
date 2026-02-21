import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const STATS = [
  { icon: "👥", label: "Total Users", value: "342" },
  { icon: "🎓", label: "Students", value: "298" },
  { icon: "🏅", label: "Alumni", value: "41" },
  { icon: "🚨", label: "Pending Approvals", value: "3" },
];

const ADMIN_ACTIONS = [
  { icon: "🗓️", label: "Events", desc: "Create and manage college events", path: "/events" },
  { icon: "🎓", label: "Alumni Directory", desc: "Browse all alumni profiles", path: "/alumni/directory" },
  { icon: "✅", label: "Approve Registrations", desc: "Review and approve new user sign-ups", path: null },
  { icon: "🗑️", label: "Manage Users", desc: "Edit roles, deactivate or delete accounts", path: null },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <header className="dashboard-header admin">
          <div>
            <h1>🔐 Admin Control Panel</h1>
            <p>{user?.email} &mdash; Full system access granted.</p>
          </div>
          <div className="header-badge admin-badge">Administrator</div>
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

        <h2 className="section-title">Admin Actions</h2>
        <section className="links-grid">
          {ADMIN_ACTIONS.map((a) => (
            <div
              key={a.label}
              className={`link-card ${a.path ? "highlight-card" : "admin-card"}`}
              onClick={() => a.path && navigate(a.path)}
              style={{ cursor: a.path ? "pointer" : "default" }}
            >
              <span className="link-icon">{a.icon}</span>
              <div>
                <strong>{a.label}</strong>
                <p>{a.desc}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}