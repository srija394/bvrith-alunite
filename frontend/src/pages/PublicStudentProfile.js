import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./ProfilePages.css";

export default function PublicStudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    API.get(`/profile/student/${id}`)
      .then((res) => setProfile(res.data.profile))
      .catch(() => setError("Student profile not found."))
      .finally(() => setLoading(false));
  }, [id]);

  // Check if current alumni has an accepted mentorship with this student
  useEffect(() => {
    if (user?.role !== "alumni") return;
    API.get("/mentorship/requests")
      .then((res) => {
        const accepted = (res.data.requests || []).some(
          (r) => r.status === "accepted" &&
            (r.student?.userId?.toString() === id || r.student?.userId === id)
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
        <button className="btn-back" onClick={() => navigate(-1)}>← Go Back</button>
      </div>
    </>
  );

  const isOwnProfile = user?.id === id;
  const canMessage = !isOwnProfile && user?.role === "alumni" && isConnected;

  return (
    <>
      <Navbar />
      <div className="profile-page-container">
        <div className="profile-page-header">
          <h1>🎓 Student Profile</h1>
          <div className="header-actions">
            {canMessage && (
              <button
                className="btn-message-profile"
                onClick={() => navigate(`/messages/${id}`)}
              >
                💬 Message
              </button>
            )}
            <button className="btn-back" onClick={() => navigate(-1)}>← Go Back</button>
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
                Year {profile.year} · {profile.branch}
                {profile.section ? ` · Section ${profile.section}` : ""}
              </p>
              {profile.user?.email && (
                <p className="profile-email">{profile.user.email}</p>
              )}
              <div className="profile-links">
                {profile.linkedIn && (
                  <a href={profile.linkedIn} target="_blank" rel="noreferrer">🔗 LinkedIn</a>
                )}
                {profile.github && (
                  <a href={profile.github} target="_blank" rel="noreferrer">🐙 GitHub</a>
                )}
              </div>
            </div>
          </div>

          <div className="profile-divider" />

          <div className="profile-details-grid">
            {profile.rollNumber && <Detail label="Roll Number" value={profile.rollNumber} />}
            {profile.branch && <Detail label="Branch" value={profile.branch} />}
            {profile.year && <Detail label="Year" value={`Year ${profile.year}`} />}
            {profile.section && <Detail label="Section" value={profile.section} />}
            {profile.phone && <Detail label="Phone" value={profile.phone} />}
          </div>

          {profile.skills?.length > 0 && (
            <div className="profile-section">
              <h3>Skills</h3>
              <div className="skills-list">
                {profile.skills.map((s, i) => {
                  const name  = typeof s === "object" ? s.name  : s;
                  const level = typeof s === "object" ? s.level : null;
                  return (
                    <span key={i} className="skill-tag" title={level || ""}>
                      {name}{level && <span style={{ opacity: 0.65, fontSize: "0.75em", marginLeft: "3px" }}>· {level[0]}</span>}
                    </span>
                  );
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