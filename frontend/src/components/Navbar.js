import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import "./Navbar.css";
import "../pages/Notifications.css";

const ROLE_LABELS = { student: "Student", alumni: "Alumni", admin: "Administrator" };
const ROLE_COLORS = { student: "#2196f3", alumni: "#4caf50", admin: "#e94560" };

const DASHBOARD_PATH = {
  student: "/dashboard/student",
  alumni: "/dashboard/alumni",
  admin: "/dashboard/admin",
};

const DASHBOARD_ROUTES = ["/dashboard/student", "/dashboard/alumni", "/dashboard/admin"];

const TYPE_ICONS = {
  mentorship_request: "🤝",
  mentorship_accepted: "✅",
  mentorship_rejected: "❌",
  new_message: "💬",
  event_registered: "🗓️",
  event_reminder: "⏰",
  announcement: "📣",
  alumni_approved: "🎉",
  job_posted: "💼",
  system: "ℹ️",
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const handleLogout = () => { logout(); navigate("/login"); };

  const dashPath = user ? DASHBOARD_PATH[user.role] : "/";
  const isOnDashboard = DASHBOARD_ROUTES.includes(location.pathname);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await API.get("/notifications/unread-count");
      setUnreadCount(data.count);
    } catch {}
  }, [user]);

  const fetchDropdownNotifs = async () => {
    try {
      const { data } = await API.get("/notifications", { params: { limit: 6 } });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {}
  };

  // Poll for unread count every 30s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBellClick = () => {
    setShowNotifDropdown((prev) => {
      if (!prev) fetchDropdownNotifs();
      return !prev;
    });
  };

  const handleNotifItemClick = async (notif) => {
    setShowNotifDropdown(false);
    if (!notif.read) {
      try {
        await API.patch(`/notifications/${notif._id}/read`);
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }
    if (notif.link) navigate(notif.link);
  };

  const relativeTime = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

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

            {/* Notification Bell */}
            <div className="navbar-bell-wrapper" ref={dropdownRef}>
              <button className="navbar-bell-btn" onClick={handleBellClick} title="Notifications">
                🔔
                {unreadCount > 0 && (
                  <span className="navbar-bell-count">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="navbar-notif-dropdown">
                  <div className="navbar-notif-dropdown-header">
                    <h4>Notifications {unreadCount > 0 && `(${unreadCount})`}</h4>
                    <Link to="/notifications" onClick={() => setShowNotifDropdown(false)}>
                      View all
                    </Link>
                  </div>
                  <div className="navbar-notif-dropdown-list">
                    {notifications.length === 0 ? (
                      <div className="navbar-notif-empty">No notifications yet.</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          className={`navbar-notif-item ${!n.read ? "unread" : ""}`}
                          onClick={() => handleNotifItemClick(n)}
                        >
                          <div className="navbar-notif-item-icon">{TYPE_ICONS[n.type] || "🔔"}</div>
                          <div>
                            <div className="navbar-notif-item-msg">{n.message}</div>
                            <div className="navbar-notif-item-time">{relativeTime(n.createdAt)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="navbar-notif-dropdown-footer">
                    <Link to="/notifications" onClick={() => setShowNotifDropdown(false)}>
                      View all notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>

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
