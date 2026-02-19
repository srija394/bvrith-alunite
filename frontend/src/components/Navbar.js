import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

const ROLE_LABELS = {
  student: "Student",
  alumni: "Alumni",
  admin: "Administrator",
};

const ROLE_COLORS = {
  student: "#2196f3",
  alumni: "#4caf50",
  admin: "#e94560",
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span>🎓</span>
        <span className="brand-name">BVRITH Alunite</span>
      </div>

      <div className="navbar-right">
        {user && (
          <>
            <span className="user-info">
              <span className="user-email">{user.email}</span>
              <span
                className="role-badge"
                style={{ background: ROLE_COLORS[user.role] }}
              >
                {ROLE_LABELS[user.role]}
              </span>
            </span>
            <button className="btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
