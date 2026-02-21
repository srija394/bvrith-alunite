import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./Events.css";

const CATEGORY_ICONS = {
  webinar: "🖥️", workshop: "🛠️", reunion: "🎓", talk: "🎤",
  hackathon: "💻", other: "📅",
};

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get(`/events/${id}`)
      .then((res) => setEvent(res.data.event))
      .catch(() => setError("Event not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      if (event.isRegistered) {
        await API.delete(`/events/${id}/register`);
        setEvent((e) => ({ ...e, isRegistered: false, registrationCount: e.registrationCount - 1 }));
      } else {
        await API.post(`/events/${id}/register`);
        setEvent((e) => ({ ...e, isRegistered: true, registrationCount: e.registrationCount + 1 }));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await API.delete(`/events/${id}`);
      navigate("/events");
    } catch {
      alert("Failed to delete event");
    }
  };

  if (loading) return <><Navbar /><div className="loading">Loading event...</div></>;
  if (error) return <><Navbar /><div className="events-container"><div className="events-error">{error}</div></div></>;

  const isPast = new Date(event.date) < new Date();
  const isFull = event.maxAttendees && event.registrationCount >= event.maxAttendees;
  const isOwner = event.createdBy?._id === user?.id || event.createdBy === user?.id;
  const canManage = isOwner || user?.role === "admin";

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  return (
    <>
      <Navbar />
      <div className="event-detail-container">

        {/* Banner */}
        <div className="event-detail-banner" style={{ background: event.bannerColor || "#0f3460" }}>
          <button className="btn-back-white" onClick={() => navigate("/events")}>← Events</button>
          <div className="banner-content">
            <span className="banner-icon">{CATEGORY_ICONS[event.category] || "📅"}</span>
            <div>
              <span className="detail-category">{event.category} · {event.mode}</span>
              <h1>{event.title}</h1>
            </div>
          </div>
          {isPast && <div className="past-ribbon">Past Event</div>}
        </div>

        <div className="event-detail-body">
          <div className="event-detail-main">

            {/* Info grid */}
            <div className="detail-info-grid">
              <div className="detail-info-item">
                <span className="detail-info-icon">📆</span>
                <div>
                  <p className="detail-info-label">Date</p>
                  <p className="detail-info-value">{formatDate(event.date)}</p>
                </div>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-icon">⏰</span>
                <div>
                  <p className="detail-info-label">Time</p>
                  <p className="detail-info-value">{event.time}</p>
                </div>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-icon">📍</span>
                <div>
                  <p className="detail-info-label">Venue</p>
                  <p className="detail-info-value">{event.venue}</p>
                </div>
              </div>
              <div className="detail-info-item">
                <span className="detail-info-icon">👥</span>
                <div>
                  <p className="detail-info-label">Registrations</p>
                  <p className="detail-info-value">
                    {event.registrationCount}
                    {event.maxAttendees ? ` / ${event.maxAttendees}` : " registered"}
                    {isFull && " · Full"}
                  </p>
                </div>
              </div>
            </div>

            {/* Meet link */}
            {event.meetLink && (
              <div className="detail-meet-link">
                <span>🔗</span>
                <a href={event.meetLink} target="_blank" rel="noreferrer">Join Online: {event.meetLink}</a>
              </div>
            )}

            {/* Description */}
            <div className="detail-section">
              <h2>About this Event</h2>
              <p>{event.description}</p>
            </div>

            {/* Organizer */}
            <div className="detail-section">
              <h2>Organised by</h2>
              <p className="organizer">{event.createdBy?.email} · <span className="role-cap">{event.createdBy?.role}</span></p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="event-detail-sidebar">
            <div className="sidebar-card">
              <h3>{isPast ? "This event has ended" : event.isRegistered ? "You're going! 🎉" : "Reserve your spot"}</h3>

              {!isPast && (
                <button
                  className={`btn-register-lg ${event.isRegistered ? "registered" : ""} ${isFull && !event.isRegistered ? "full" : ""}`}
                  onClick={handleRegister}
                  disabled={registering || (isFull && !event.isRegistered)}
                >
                  {registering
                    ? "Updating..."
                    : event.isRegistered
                    ? "✓ Cancel Registration"
                    : isFull
                    ? "Event Full"
                    : "Register Now"}
                </button>
              )}

              {event.isRegistered && event.meetLink && (
                <a href={event.meetLink} target="_blank" rel="noreferrer" className="btn-join-link">
                  🔗 Join Meeting
                </a>
              )}

              {canManage && (
                <button className="btn-delete-lg" onClick={handleDelete}>
                  🗑️ Delete Event
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
