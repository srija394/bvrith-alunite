import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./Events.css";

const CATEGORIES = ["webinar", "workshop", "reunion", "talk", "hackathon", "other"];
const MODES = ["online", "offline", "hybrid"];

const CATEGORY_ICONS = {
  webinar: "🖥️", workshop: "🛠️", reunion: "🎓", talk: "🎤",
  hackathon: "💻", other: "📅",
};

const BANNER_COLORS = [
  "#0f3460", "#e94560", "#16a34a", "#d97706", "#7c3aed", "#0891b2",
];

export default function EventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({ category: "", mode: "", upcoming: "true" });
  const [showCreate, setShowCreate] = useState(false);
  const [registering, setRegistering] = useState(null);

  const canCreate = user?.role === "alumni" || user?.role === "admin";

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.category) params.set("category", filter.category);
      if (filter.mode) params.set("mode", filter.mode);
      if (filter.upcoming) params.set("upcoming", filter.upcoming);
      const { data } = await API.get(`/events?${params}`);
      setEvents(data.events);
    } catch {
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [filter]);

  const handleRegister = async (eventId, isRegistered) => {
    setRegistering(eventId);
    try {
      if (isRegistered) {
        await API.delete(`/events/${eventId}/register`);
      } else {
        await API.post(`/events/${eventId}/register`);
      }
      setEvents((prev) =>
        prev.map((e) =>
          e._id === eventId
            ? {
                ...e,
                isRegistered: !isRegistered,
                registrationCount: isRegistered
                  ? e.registrationCount - 1
                  : e.registrationCount + 1,
              }
            : e
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update registration");
    } finally {
      setRegistering(null);
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await API.delete(`/events/${eventId}`);
      setEvents((prev) => prev.filter((e) => e._id !== eventId));
    } catch {
      alert("Failed to delete event");
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  };

  const isPast = (dateStr) => new Date(dateStr) < new Date();

  const dashboardLink = user?.role === "admin"
    ? "/dashboard/admin"
    : user?.role === "alumni"
    ? "/dashboard/alumni"
    : "/dashboard/student";

  return (
    <>
      <Navbar />
      <div className="events-container">

        {/* Header */}
        <div className="events-header">
          <div>
            <h1>📅 Events</h1>
            <p>College talks, workshops, reunions and more</p>
          </div>
          <div className="events-header-actions">
            <button className="btn-back" onClick={() => navigate(dashboardLink)}>← Dashboard</button>
            {canCreate && (
              <button className="btn-create-event" onClick={() => setShowCreate(true)}>
                + Create Event
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="events-filters">
          <select value={filter.category} onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))} className="filter-select">
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select value={filter.mode} onChange={(e) => setFilter((f) => ({ ...f, mode: e.target.value }))} className="filter-select">
            <option value="">All Modes</option>
            {MODES.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
          <div className="toggle-group">
            <button
              className={`toggle-btn ${filter.upcoming === "true" ? "active" : ""}`}
              onClick={() => setFilter((f) => ({ ...f, upcoming: "true" }))}
            >Upcoming</button>
            <button
              className={`toggle-btn ${filter.upcoming !== "true" ? "active" : ""}`}
              onClick={() => setFilter((f) => ({ ...f, upcoming: "" }))}
            >All</button>
          </div>
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="events-loading"><div className="ev-spinner" /><p>Loading events...</p></div>
        ) : error ? (
          <div className="events-error">{error}</div>
        ) : events.length === 0 ? (
          <div className="events-empty">
            <span>📭</span>
            <p>No events found. {canCreate && "Create one to get started!"}</p>
          </div>
        ) : (
          <div className="events-grid">
            {events.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                user={user}
                onRegister={handleRegister}
                onDelete={handleDelete}
                registering={registering}
                isPast={isPast(event.date)}
                formatDate={formatDate}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreate && (
        <CreateEventModal
          onClose={() => setShowCreate(false)}
          onCreated={(newEvent) => {
            setEvents((prev) => [newEvent, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </>
  );
}

function EventCard({ event, user, onRegister, onDelete, registering, isPast, formatDate, navigate }) {
  const isOwner = event.createdBy?._id === user?.id || event.createdBy === user?.id;
  const canManage = isOwner || user?.role === "admin";
  const isFull = event.maxAttendees && event.registrationCount >= event.maxAttendees;

  return (
    <div className="event-card" onClick={() => navigate(`/events/${event._id}`)}>
      {/* Banner */}
      <div className="event-banner" style={{ background: event.bannerColor || "#0f3460" }}>
        <span className="event-category-icon">{CATEGORY_ICONS[event.category] || "📅"}</span>
        <span className="event-mode-badge">{event.mode}</span>
        {isPast && <span className="event-past-badge">Past</span>}
      </div>

      <div className="event-body">
        <h3>{event.title}</h3>
        <p className="event-desc">{event.description.slice(0, 90)}{event.description.length > 90 ? "..." : ""}</p>

        <div className="event-meta">
          <span>📆 {formatDate(event.date)}</span>
          <span>⏰ {event.time}</span>
          <span>📍 {event.venue}</span>
          {event.maxAttendees && (
            <span className={isFull ? "text-full" : ""}>
              👥 {event.registrationCount}/{event.maxAttendees} {isFull ? "· Full" : ""}
            </span>
          )}
          {!event.maxAttendees && <span>👥 {event.registrationCount} registered</span>}
        </div>

        <div className="event-footer" onClick={(e) => e.stopPropagation()}>
          {!isPast && (
            <button
              className={`btn-register ${event.isRegistered ? "registered" : ""} ${isFull && !event.isRegistered ? "full" : ""}`}
              disabled={registering === event._id || (isFull && !event.isRegistered)}
              onClick={() => onRegister(event._id, event.isRegistered)}
            >
              {registering === event._id
                ? "..."
                : event.isRegistered
                ? "✓ Registered"
                : isFull
                ? "Full"
                : "Register"}
            </button>
          )}
          {canManage && (
            <button
              className="btn-delete-event"
              onClick={() => onDelete(event._id)}
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateEventModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "", description: "", date: "", time: "", venue: "",
    mode: "offline", meetLink: "", category: "other",
    maxAttendees: "", bannerColor: "#0f3460",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { ...form, maxAttendees: form.maxAttendees ? Number(form.maxAttendees) : null };
      const { data } = await API.post("/events", payload);
      onCreated({ ...data.event, isRegistered: false, registrationCount: 0 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📅 Create New Event</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="create-event-form">
          <div className="form-row">
            <div className="form-group full">
              <label>Event Title *</label>
              <input value={form.title} onChange={set("title")} required placeholder="e.g. Alumni Tech Talk 2025" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full">
              <label>Description *</label>
              <textarea value={form.description} onChange={set("description")} required rows={3} maxLength={2000} placeholder="What is this event about?" />
            </div>
          </div>

          <div className="form-row two-col">
            <div className="form-group">
              <label>Date *</label>
              <input type="date" value={form.date} onChange={set("date")} required min={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="form-group">
              <label>Time *</label>
              <input value={form.time} onChange={set("time")} required placeholder="e.g. 10:00 AM" />
            </div>
          </div>

          <div className="form-row two-col">
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={set("category")}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Mode</label>
              <select value={form.mode} onChange={set("mode")}>
                {MODES.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full">
              <label>Venue / Location *</label>
              <input value={form.venue} onChange={set("venue")} required placeholder="e.g. Main Auditorium or Zoom" />
            </div>
          </div>

          {(form.mode === "online" || form.mode === "hybrid") && (
            <div className="form-row">
              <div className="form-group full">
                <label>Meet Link</label>
                <input value={form.meetLink} onChange={set("meetLink")} placeholder="https://meet.google.com/..." />
              </div>
            </div>
          )}

          <div className="form-row two-col">
            <div className="form-group">
              <label>Max Attendees (leave blank = unlimited)</label>
              <input type="number" value={form.maxAttendees} onChange={set("maxAttendees")} min={1} placeholder="e.g. 100" />
            </div>
            <div className="form-group">
              <label>Banner Color</label>
              <div className="color-picker">
                {BANNER_COLORS.map((c) => (
                  <button
                    type="button" key={c}
                    className={`color-swatch ${form.bannerColor === c ? "selected" : ""}`}
                    style={{ background: c }}
                    onClick={() => setForm((f) => ({ ...f, bannerColor: c }))}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Creating..." : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
