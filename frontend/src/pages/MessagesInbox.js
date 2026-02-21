import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./Messages.css";

export default function MessagesInbox() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get("/messages/inbox")
      .then((res) => setConversations(res.data.conversations))
      .catch(() => setError("Failed to load messages"))
      .finally(() => setLoading(false));
  }, []);

  const dashboardLink =
    user?.role === "alumni" ? "/dashboard/alumni" : "/dashboard/student";

  const getDisplayName = (contact) =>
    contact.profile?.fullName || contact.email;

  const getInitials = (contact) => {
    const name = contact.profile?.fullName;
    if (name) return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    return contact.email?.[0]?.toUpperCase() || "?";
  };

  const getRoleLabel = (role) =>
    role === "alumni" ? "Alumni" : role === "student" ? "Student" : role;

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <>
      <Navbar />
      <div className="messages-container">
        <div className="messages-header">
          <div>
            <h1>💬 Messages</h1>
            <p>Your conversations with {user?.role === "student" ? "alumni mentors" : "students"}</p>
          </div>
          <button className="btn-back" onClick={() => navigate(dashboardLink)}>
            ← Dashboard
          </button>
        </div>

        {loading ? (
          <div className="msg-loading">
            <div className="msg-spinner" />
            <p>Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="msg-error">{error}</div>
        ) : conversations.length === 0 ? (
          <div className="msg-empty">
            <span>💬</span>
            <p>No conversations yet.</p>
            {user?.role === "student" && (
              <button className="btn-find" onClick={() => navigate("/mentorship/find")}>
                Find a Mentor to Message
              </button>
            )}
          </div>
        ) : (
          <div className="conversation-list">
            {conversations.map((conv) => (
              <div
                key={conv.contact.userId}
                className={`conversation-item ${conv.unreadCount > 0 ? "unread" : ""}`}
                onClick={() => navigate(`/messages/${conv.contact.userId}`)}
              >
                <div className="conv-avatar">
                  {conv.contact.profile?.profilePhoto ? (
                    <img src={conv.contact.profile.profilePhoto} alt="" />
                  ) : (
                    <span>{getInitials(conv.contact)}</span>
                  )}
                  {conv.unreadCount > 0 && (
                    <span className="unread-dot">{conv.unreadCount}</span>
                  )}
                </div>

                <div className="conv-info">
                  <div className="conv-top">
                    <span className="conv-name">{getDisplayName(conv.contact)}</span>
                    <span className="conv-time">{formatTime(conv.lastMessage.createdAt)}</span>
                  </div>
                  <div className="conv-bottom">
                    <span className="conv-preview">
                      {conv.lastMessage.fromMe ? "You: " : ""}
                      {conv.lastMessage.content.slice(0, 60)}
                      {conv.lastMessage.content.length > 60 ? "..." : ""}
                    </span>
                    <span className={`role-tag ${conv.contact.role}`}>
                      {getRoleLabel(conv.contact.role)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
