import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./ProfilePages.css";

export default function ViewProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    API.get("/profile/me")
      .then((res) => {
        if (!res.data.exists) navigate("/profile/create", { replace: true });
        else setProfile(res.data.profile);
      })
      .catch(() => navigate("/profile/create", { replace: true }))
      .finally(() => setFetching(false));
  }, [navigate]);

  const dashboardLink = user?.role === "alumni"
    ? "/dashboard/alumni"
    : user?.role === "admin"
    ? "/dashboard/admin"
    : "/dashboard/student";

  if (fetching) return <><Navbar /><div className="loading">Loading profile...</div></>;
  if (!profile) return null;

  const isAlumni = user?.role === "alumni";

  return (
    <>
      <Navbar />
      <div className="profile-page-container">
        <div className="profile-page-header">
          <div>
            <h1>👤 My Profile</h1>
          </div>
          <div className="header-actions">
            <button className="btn-view" onClick={() => navigate("/profile/edit")}>Edit Profile</button>
            <button className="btn-files" onClick={() => navigate("/my-files")}>☁️ My Files</button>
            <button className="btn-back" onClick={() => navigate(dashboardLink)}>← Dashboard</button>
          </div>
        </div>

        <div className="profile-card">
          {/* Top section */}
          <div className="profile-top">
            <div className="profile-avatar">
              {profile.profilePhoto
                ? <img src={profile.profilePhoto} alt="avatar" />
                : <span>{profile.fullName?.[0]?.toUpperCase() || "?"}</span>
              }
            </div>
            <div className="profile-name-section">
              <h2>{profile.fullName}</h2>
              <p className="profile-sub">
                {isAlumni
                  ? `${profile.currentRole || "Alumni"} ${profile.currentCompany ? `@ ${profile.currentCompany}` : ""}`
                  : `Year ${profile.year} · ${profile.branch} ${profile.section ? `· Section ${profile.section}` : ""}`
                }
              </p>
              <p className="profile-email">{user?.email}</p>

              {isAlumni && profile.isAvailableForMentorship && (
                <span className="mentorship-badge">✅ Available for Mentorship</span>
              )}
              {isAlumni && profile.availableForTalks && (
                <span className="mentorship-badge" style={{background:"#ede9fe",color:"#5b21b6",marginLeft:"0.4rem"}}>🎤 Available for Talks</span>
              )}
              {isAlumni && profile.portfolioUrl && (
                <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" style={{display:"inline-block",marginLeft:"0.4rem",fontSize:"0.85rem",color:"#0891b2"}}>🌐 Portfolio ↗</a>
              )}

              <div className="profile-links">
                {profile.linkedIn && <a href={profile.linkedIn} target="_blank" rel="noreferrer">🔗 LinkedIn</a>}
                {profile.github && <a href={profile.github} target="_blank" rel="noreferrer">🐙 GitHub</a>}
              </div>
            </div>
          </div>

          <div className="profile-divider" />

          {/* Details grid */}
          <div className="profile-details-grid">
            <Detail label="Roll Number" value={profile.rollNumber} />
            <Detail label="Branch" value={profile.branch} />
            <Detail label="Phone" value={profile.phone} />
            {!isAlumni && <Detail label="Year" value={profile.year ? `Year ${profile.year}` : null} />}
            {!isAlumni && <Detail label="Section" value={profile.section} />}
            {isAlumni && <Detail label="Graduation Year" value={profile.graduationYear} />}
            {isAlumni && <Detail label="Current Company" value={profile.currentCompany} />}
            {isAlumni && <Detail label="Current Role" value={profile.currentRole} />}
            {isAlumni && <Detail label="Location" value={profile.location} />}
          </div>

          {/* Skills */}
          {profile.skills?.length > 0 && (
            <div className="profile-section">
              <h3>Skills</h3>
              <div className="skills-list">
                {profile.skills.map((s) => <span key={s} className="skill-tag">{s}</span>)}
              </div>
            </div>
          )}

          {/* Webinar Topics */}
          {isAlumni && profile.webinarTopics?.length > 0 && (
            <div className="profile-section">
              <h3>🎤 Talk & Webinar Topics</h3>
              <div className="skills-list">
                {profile.webinarTopics.map((t) => (
                  <span key={t} className="skill-tag" style={{background:"#ede9fe",color:"#5b21b6"}}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="profile-section">
              <h3>About</h3>
              <p className="bio-text">{profile.bio}</p>
            </div>
          )}

          {/* Achievements */}
          <AchievementsSection
            achievements={profile.achievements || []}
            onAdd={async (data) => {
              const res = await API.post("/profile/me/achievements", data);
              setProfile((p) => ({ ...p, achievements: res.data.achievements }));
            }}
            onDelete={async (id) => {
              const res = await API.delete(`/profile/me/achievements/${id}`);
              setProfile((p) => ({ ...p, achievements: res.data.achievements }));
            }}
            editable={true}
          />
        </div>
      </div>
    </>
  );
}

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function AchievementsSection({ achievements, onAdd, onDelete, editable }) {
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({ title: "", description: "", date: "", link: "" });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onAdd(form);
      setForm({ title: "", description: "", date: "", link: "" });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add achievement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h3>🏆 Achievements</h3>
        {editable && (
          <button
            onClick={() => setShowForm((v) => !v)}
            style={{ background: "#0f3460", color: "#fff", border: "none", borderRadius: "7px", padding: "0.3rem 0.85rem", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
          >
            {showForm ? "Cancel" : "+ Add"}
          </button>
        )}
      </div>

      {editable && showForm && (
        <form onSubmit={handleAdd} style={{ background: "#f8fafc", borderRadius: "10px", padding: "1rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {error && <div style={{ color: "#dc2626", fontSize: "0.85rem" }}>{error}</div>}
          <input required placeholder="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={{ padding: "0.45rem 0.75rem", borderRadius: "7px", border: "1.5px solid #ddd", fontSize: "0.875rem" }} />
          <textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} maxLength={500} style={{ padding: "0.45rem 0.75rem", borderRadius: "7px", border: "1.5px solid #ddd", fontSize: "0.875rem", resize: "vertical" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <input type="date" placeholder="Date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={{ padding: "0.45rem 0.75rem", borderRadius: "7px", border: "1.5px solid #ddd", fontSize: "0.875rem" }} />
            <input placeholder="Link (optional)" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} style={{ padding: "0.45rem 0.75rem", borderRadius: "7px", border: "1.5px solid #ddd", fontSize: "0.875rem" }} />
          </div>
          <button type="submit" disabled={saving} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: "7px", padding: "0.5rem", fontWeight: 600, cursor: "pointer" }}>
            {saving ? "Saving..." : "Save Achievement"}
          </button>
        </form>
      )}

      {achievements.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: "0.875rem" }}>No achievements added yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {achievements.map((a) => (
            <div key={a._id} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "0.85rem 1rem", position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <strong style={{ color: "#1a1a2e", fontSize: "0.9rem" }}>{a.title}</strong>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {a.date && <span style={{ fontSize: "0.75rem", color: "#888" }}>{new Date(a.date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>}
                  {editable && (
                    <button onClick={() => onDelete(a._id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "0.85rem", padding: 0 }} title="Delete">✕</button>
                  )}
                </div>
              </div>
              {a.description && <p style={{ margin: "0.3rem 0 0", fontSize: "0.85rem", color: "#555" }}>{a.description}</p>}
              {a.link && <a href={a.link} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "#0f3460", marginTop: "0.25rem", display: "inline-block" }}>🔗 View</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { AchievementsSection };
