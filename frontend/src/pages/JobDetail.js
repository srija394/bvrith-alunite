import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./Jobs.css";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get(`/jobs/${id}`)
      .then((res) => setJob(res.data.job))
      .catch(() => setError("Job not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this job posting?")) return;
    try {
      await API.delete(`/jobs/${id}`);
      navigate("/jobs");
    } catch {
      alert("Failed to delete");
    }
  };

  if (loading) return <><Navbar /><div className="loading">Loading...</div></>;
  if (error) return (
    <><Navbar />
      <div className="job-detail-container">
        <div className="jobs-error">{error}</div>
        <button className="btn-back" style={{ marginTop: "1rem" }} onClick={() => navigate("/jobs")}>← Back to Jobs</button>
      </div>
    </>
  );

  const isOwner = job.postedBy?._id === user?.id || job.postedBy === user?.id;
  const canManage = isOwner || user?.role === "admin";

  const dl = job.deadline
    ? Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <Navbar />
      <div className="job-detail-container">

        {/* Banner */}
        <div className="job-detail-banner">
          <button className="btn-back-white" onClick={() => navigate("/jobs")}>← Back to Jobs</button>
          <div className="job-detail-badges">
            <span className="detail-badge">{job.type === "job" ? "💼 Full-time Job" : "🎓 Internship"}</span>
            <span className="detail-badge">💻 {job.mode}</span>
            {job.location && <span className="detail-badge">📍 {job.location}</span>}
          </div>
          <h1>{job.title}</h1>
          <p className="job-detail-company">🏢 {job.company}</p>
        </div>

        <div className="job-detail-body">

          {/* Main content */}
          <div>
            <div className="job-detail-section">
              <h2>About the Role</h2>
              <p>{job.description}</p>
            </div>

            {job.skillsRequired?.length > 0 && (
              <div className="job-detail-section">
                <h2>Skills Required</h2>
                <div className="job-skills-wrap">
                  {job.skillsRequired.map((s) => (
                    <span key={s} className="job-skill-tag" style={{ fontSize: "0.875rem", padding: "0.3rem 0.8rem" }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="job-detail-section">
              <h2>Posted by</h2>
              <p>
                <strong>{job.posterName}</strong>
                {job.posterRole && ` · ${job.posterRole}`}
              </p>
              <p style={{ marginTop: "0.25rem", color: "#888", fontSize: "0.85rem" }}>
                Posted on {formatDate(job.createdAt)}
              </p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="job-sidebar-card">
            <h3>Opportunity Details</h3>

            <div className="job-info-list">
              <div className="job-info-row">
                <span className="job-info-label">Type</span>
                <span className="job-info-value">{job.type === "job" ? "Full-time" : "Internship"}</span>
              </div>
              <div className="job-info-row">
                <span className="job-info-label">Mode</span>
                <span className="job-info-value" style={{ textTransform: "capitalize" }}>{job.mode}</span>
              </div>
              {job.location && (
                <div className="job-info-row">
                  <span className="job-info-label">Location</span>
                  <span className="job-info-value">{job.location}</span>
                </div>
              )}
              {job.stipend && (
                <div className="job-info-row">
                  <span className="job-info-label">Stipend</span>
                  <span className="job-info-value">{job.stipend}</span>
                </div>
              )}
              {job.salary && (
                <div className="job-info-row">
                  <span className="job-info-label">Salary</span>
                  <span className="job-info-value">{job.salary}</span>
                </div>
              )}
              {job.duration && (
                <div className="job-info-row">
                  <span className="job-info-label">Duration</span>
                  <span className="job-info-value">{job.duration}</span>
                </div>
              )}
              {job.deadline && (
                <div className="job-info-row">
                  <span className="job-info-label">Deadline</span>
                  <span className="job-info-value" style={{ color: dl !== null && dl < 7 ? "#e94560" : "#16a34a" }}>
                    {formatDate(job.deadline)}
                    {dl !== null && ` (${dl > 0 ? `${dl}d left` : "Expired"})`}
                  </span>
                </div>
              )}
            </div>

            {job.applyLink ? (
              <a href={job.applyLink} target="_blank" rel="noreferrer" className="btn-apply">
                Apply Now ↗
              </a>
            ) : (
              <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "0.75rem", fontSize: "0.85rem", color: "#888", textAlign: "center", marginBottom: "0.75rem" }}>
                No external apply link — contact the poster directly.
              </div>
            )}

            {canManage && (
              <button className="btn-delete-job" onClick={handleDelete}>
                🗑️ Delete Posting
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
