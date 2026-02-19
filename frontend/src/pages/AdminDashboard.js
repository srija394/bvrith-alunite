import React from "react";
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
  { icon: "✅", label: "Approve Registrations", desc: "Review and approve new user sign-ups" },
  { icon: "🗑️", label: "Manage Users", desc: "Edit roles, deactivate or delete accounts" },
  { icon: "📊", label: "Reports & Analytics", desc: "View engagement metrics and activity logs" },
  { icon: "📣", label: "Send Announcements", desc: "Broadcast notices to students or alumni" },
];

export default function AdminDashboard() {
  const { user } = useAuth();

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
            <div key={a.label} className="link-card admin-card">
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
