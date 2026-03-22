import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./Messages.css";
import ClickableName from "../components/ClickableName";

export default function MessageThread() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [contact, setContact] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const pollRef = useRef(null);

  const fetchMessages = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const { data } = await API.get(`/messages/conversation/${userId}`);
      setMessages(data.messages);
    } catch {
      setError("Failed to load conversation");
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  // Load contact info from inbox
  const fetchContact = async () => {
    try {
      const { data } = await API.get("/messages/inbox");
      const conv = data.conversations.find(
        (c) => c.contact.userId === userId
      );
      if (conv) setContact(conv.contact);
    } catch {}
  };

  useEffect(() => {
    fetchMessages(true);
    fetchContact();

    // Poll every 5 seconds for new messages
    pollRef.current = setInterval(() => fetchMessages(false), 5000);
    return () => clearInterval(pollRef.current);
  }, [userId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;

    setSending(true);
    try {
      const { data } = await API.post("/messages/send", {
        receiverId: userId,
        content: content.trim(),
      });
      setMessages((prev) => [...prev, data.data]);
      setContent("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.createdAt).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const contactName = contact?.profile?.fullName || contact?.email || "User";
  const contactInitials = contactName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <Navbar />
      <div className="thread-container">
        {/* Thread Header */}
        <div className="thread-header">
          <button className="btn-back-sm" onClick={() => navigate("/messages")}>←</button>
          <div className="thread-avatar">
            {contact?.profile?.profilePhoto ? (
              <img src={contact.profile.profilePhoto} alt="" />
            ) : (
              <span>{contactInitials}</span>
            )}
          </div>
          <div className="thread-contact-info">
            <h2><ClickableName name={contactName} userId={contact?.userId} role={contact?.role} /></h2>
            <p>
              {contact?.role === "alumni"
                ? `${contact.profile?.currentRole || "Alumni"}${contact.profile?.currentCompany ? ` @ ${contact.profile.currentCompany}` : ""}`
                : `Year ${contact?.profile?.year || ""} · ${contact?.profile?.branch || "Student"}`
              }
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="thread-body">
          {loading ? (
            <div className="msg-loading"><div className="msg-spinner" /></div>
          ) : error ? (
            <div className="msg-error">{error}</div>
          ) : messages.length === 0 ? (
            <div className="thread-empty">
              <p>No messages yet. Say hello! 👋</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="date-divider">
                  <span>{formatDate(date)}</span>
                </div>
                {msgs.map((msg) => {
                  const senderId = msg.sender?._id || msg.sender;
                  const isMe = senderId?.toString() === user?.id?.toString();
                  const senderName = isMe
                    ? "You"
                    : contact?.profile?.fullName || contact?.email || "Them";
                  return (
                    <div key={msg._id} className={`message-row ${isMe ? "me" : "them"}`}>
                      {!isMe && (
                        <div className="msg-avatar-sm">
                          {contact?.profile?.profilePhoto
                            ? <img src={contact.profile.profilePhoto} alt="" />
                            : <span>{contactInitials}</span>
                          }
                        </div>
                      )}
                      <div className="message-bubble-wrap">
                        <span className="msg-sender-name">{senderName}</span>
                        <div className="message-bubble">
                          <p>{msg.content}</p>
                          <span className="msg-time">{formatTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Send Box */}
        <form className="send-box" onSubmit={handleSend}>
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            maxLength={2000}
            autoComplete="off"
          />
          <button type="submit" disabled={!content.trim() || sending}>
            {sending ? "..." : "Send ➤"}
          </button>
        </form>
      </div>
    </>
  );
}