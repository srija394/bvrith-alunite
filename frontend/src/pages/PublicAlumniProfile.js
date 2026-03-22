import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./ProfilePages.css";
import { AchievementsSection } from "./ViewProfile";

export default function PublicAlumniProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    API.get(`/profile/alumni/${id}`)
      .then((res) => setProfile(res.data.profile))
      .catch(() => setError("Alumni profile not found."))
      .finally(() => setLoading(false));
  }, [id]);

  // Check if current student has an accepted mentorship with this alumni
  useEffect(() => {
    if (user?.role !== "student") return;
    API.get("/mentorship/my-requests")
      .then((res) => {
        const accepted = (res.data.requests || []).some(
          (r) => r.status === "accepted" &&
            (r.alumni?.userId?.toString() === id || r.alumni?.userId === id)
        );
        setIsConnected(accepted);
      })
      .catch(() => {});
  }, [id, user]);

  if (loading) return <><Navbar /><div className="loading">Loading profile...</div></>;

  if (error) return (
    <>
      <Navbar />
      <div className="profile-page-container">
        <div className="page-error">{error}</div>
        <button className="btn-back" onClick={() => navigate("/alumni/directory")}>← Back to Directory</button>
      </div>
    </>
  );

  // Don't show message button on own profile
  const isOwnProfile = user?.id === id;
  const canMessage = !isOwnProfile && user?.role === "student" && isConnected;

  return (
    <>
      <Navbar />
      <div className="profile-page-container">
        <div className="profile-page-header">
          <h1>👤 Alumni Profile</h1>
          <div className="header-actions">
            {canMessage && (
              <button
                className="btn-message-profile"
                onClick={() => navigate(`/messages/${id}`)}
              >
                💬 Message
              </button>
            )}
            <button className="btn-back" onClick={() => navigate("/alumni/directory")}>← Back to Directory</button>
          </div>
        </div>

        <div className="profile-card">
          <div className="profile-top">
            <div className="profile-avatar">
              {profile.photoUrl
                ? <img src={profile.photoUrl} alt={profile.fullName} />
                : <span>{profile.fullName?.[0]?.toUpperCase() || "?"}</span>
              }
            </div>
            <div className="profile-name-section">
              <h2>{profile.fullName}</h2>
              <p className="profile-sub">
                {profile.currentRole
                  ? `${profile.currentRole}${profile.currentCompany ? ` @ ${profile.currentCompany}` : ""}`
                  : profile.currentCompany || "Alumni"
                }
              </p>
              {profile.user?.email && <p className="profile-email">{profile.user.email}</p>}
              {profile.isAvailableForMentorship && (
                <span className="mentorship-badge">✅ Available for Mentorship</span>
              )}
              {profile.availableForTalks && (
                <span className="mentorship-badge" style={{background:"#ede9fe",color:"#5b21b6",marginLeft:"0.4rem"}}>🎤 Available for Talks</span>
              )}
              {profile.portfolioUrl && (
                <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" style={{display:"inline-block",marginLeft:"0.4rem",fontSize:"0.85rem",color:"#0891b2"}}>🌐 Portfolio ↗</a>
              )}
              <div className="profile-links">
                {profile.linkedIn && <a href={profile.linkedIn} target="_blank" rel="noreferrer">🔗 LinkedIn</a>}
                {profile.github && <a href={profile.github} target="_blank" rel="noreferrer">🐙 GitHub</a>}
              </div>
            </div>
          </div>

          <div className="profile-divider" />

          <div className="profile-details-grid">
            {profile.branch && <Detail label="Branch" value={profile.branch} />}
            {profile.graduationYear && <Detail label="Graduation Year" value={profile.graduationYear} />}
            {profile.currentCompany && <Detail label="Company" value={profile.currentCompany} />}
            {profile.currentRole && <Detail label="Role" value={profile.currentRole} />}
            {profile.location && <Detail label="Location" value={profile.location} />}
            {profile.phone && <Detail label="Phone" value={profile.phone} />}
          </div>

          {profile.skills?.length > 0 && (
            <div className="profile-section">
              <h3>Skills</h3>
              <div className="skills-list">
                {profile.skills.map((s, i) => {
                  const name = typeof s === "object" ? s.name : s;
                  return <span key={i} className="skill-tag">{name}</span>;
                })}
              </div>
            </div>
          )}

          {profile.bio && (
            <div className="profile-section">
              <h3>About</h3>
              <p className="bio-text">{profile.bio}</p>
            </div>
          )}

          {profile.webinarTopics?.length > 0 && (
            <div className="profile-section">
              <h3>🎤 Talk & Webinar Topics</h3>
              <div className="skills-list">
                {profile.webinarTopics.map((t) => (
                  <span key={t} className="skill-tag" style={{background:"#ede9fe",color:"#5b21b6"}}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {profile.resumeUrl && (
            <div className="profile-section">
              <h3>📄 Resume</h3>
              <div className="public-file-item">
                <span>📎</span>
                <div>
                  <p className="public-file-name">{profile.resumeName || "Resume"}</p>
                  <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="public-file-link">
                    View / Download Resume ↗
                  </a>
                </div>
              </div>
            </div>
          )}

          {profile.certificates?.length > 0 && (
            <div className="profile-section">
              <h3>🏆 Certificates</h3>
              <div className="public-certs-list">
                {profile.certificates.map((cert, i) => (
                  <div key={i} className="public-file-item">
                    <span>🎖️</span>
                    <div>
                      <p className="public-file-name">{cert.name}</p>
                      {cert.url && (
                        <a href={cert.url} target="_blank" rel="noreferrer" className="public-file-link">
                          View / Download ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {profile.achievements?.length > 0 && (
            <AchievementsSection
              achievements={profile.achievements}
              editable={false}
            />
          )}
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