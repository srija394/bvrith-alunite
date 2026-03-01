import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

const ROLE_LABELS = { student: "Student", alumni: "Alumni", admin: "Administrator" };
const ROLE_COLORS = { student: "#2196f3", alumni: "#4caf50", admin: "#e94560" };

const DASHBOARD_PATH = {
  student: "/dashboard/student",
  alumni: "/dashboard/alumni",
  admin: "/dashboard/admin",
};

const DASHBOARD_ROUTES = ["/dashboard/student", "/dashboard/alumni", "/dashboard/admin"];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate("/login"); };

  const dashPath = user ? DASHBOARD_PATH[user.role] : "/";
  const isOnDashboard = DASHBOARD_ROUTES.includes(location.pathname);

  return (
    <nav className="navbar">
      {/* Clickable logo → back to dashboard */}
      <div
        className="navbar-brand"
        onClick={() => navigate(dashPath)}
        style={{ cursor: "pointer" }}
        title="Go to Dashboard"
      >
        <span>🎓</span>
        <span className="brand-name">BVRITH Alunite</span>
      </div>

      <div className="navbar-right">
        {user && (
          <>
            {/* Back to dashboard button — hidden when already on dashboard */}
            {!isOnDashboard && (
              <button
                className="btn-dashboard"
                onClick={() => navigate(dashPath)}
              >
                ⬅ Dashboard
              </button>
            )}
            <span className="user-info">
              <span className="user-email">{user.email}</span>
              <span className="role-badge" style={{ background: ROLE_COLORS[user.role] }}>
                {ROLE_LABELS[user.role]}
              </span>
            </span>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  );
}
