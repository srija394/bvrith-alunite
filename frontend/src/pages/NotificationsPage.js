import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import "./Notifications.css";

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

function NotificationItem({ notif, onMarkRead, onDelete }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notif.read) onMarkRead(notif._id);
    if (notif.link) navigate(notif.link);
  };

  return (
    <div
      className={`notif-item ${!notif.read ? "notif-unread" : ""}`}
      onClick={handleClick}
    >
      <div className="notif-icon">{TYPE_ICONS[notif.type] || "🔔"}</div>
      <div className="notif-body">
        <p className="notif-message">{notif.message}</p>
        <span className="notif-time">
          {new Date(notif.createdAt).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      </div>
      <div className="notif-actions">
        {!notif.read && (
          <button
            className="notif-mark-read"
            title="Mark as read"
            onClick={(e) => { e.stopPropagation(); onMarkRead(notif._id); }}
          >
            ✓
          </button>
        )}
        <button
          className="notif-delete"
          title="Delete"
          onClick={(e) => { e.stopPropagation(); onDelete(notif._id); }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "unread"
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter === "unread") params.unreadOnly = "true";
      const { data } = await API.get("/notifications", { params });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await API.patch("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch {}
  };

  return (
    <>
      <Navbar />
      <div className="notif-page-container">
        <div className="notif-page-header">
          <div>
            <h1>🔔 Notifications</h1>
            {unreadCount > 0 && (
              <span className="notif-unread-badge">{unreadCount} unread</span>
            )}
          </div>
          <div className="notif-header-actions">
            <div className="notif-filter-group">
              <button
                className={`notif-filter-btn ${filter === "all" ? "active" : ""}`}
                onClick={() => { setFilter("all"); setPage(1); }}
              >
                All
              </button>
              <button
                className={`notif-filter-btn ${filter === "unread" ? "active" : ""}`}
                onClick={() => { setFilter("unread"); setPage(1); }}
              >
                Unread
              </button>
            </div>
            {unreadCount > 0 && (
              <button className="notif-mark-all-btn" onClick={handleMarkAllRead}>
                ✓ Mark all read
              </button>
            )}
          </div>
        </div>

        <div className="notif-list">
          {loading ? (
            <div className="notif-loading">Loading notifications…</div>
          ) : notifications.length === 0 ? (
            <div className="notif-empty">
              <span className="notif-empty-icon">🔕</span>
              <p>{filter === "unread" ? "No unread notifications." : "No notifications yet."}</p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n._id}
                notif={n}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="notif-pagination">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              ← Prev
            </button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
