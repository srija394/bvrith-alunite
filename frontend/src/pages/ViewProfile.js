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

          {/* Bio */}
          {profile.bio && (
            <div className="profile-section">
              <h3>About</h3>
              <p className="bio-text">{profile.bio}</p>
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
