import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./Jobs.css";


function ScoreBadge({ score, matchedCount }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "60px" }}>
      <span style={{ fontSize: "0.68rem", color: "#888", textAlign: "center", lineHeight: 1.2 }}>
        {matchedCount} skill{matchedCount !== 1 ? "s" : ""} matched
      </span>
    </div>
  );
}

export default function JobDetail() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const [job, setJob]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  // Matched students panel
  const [matches, setMatches]         = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [rerunning, setRerunning]     = useState(false);

  useEffect(() => {
    API.get(`/jobs/${id}`)
      .then((res) => setJob(res.data.job))
      .catch(() => setError("Job not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner  = job && (job.postedBy?._id === user?.id || job.postedBy === user?.id);
  const canManage = isOwner || user?.role === "admin";

  const loadMatches = async () => {
    setMatchLoading(true);
    try {
      const { data } = await API.get(`/jobs/${id}/matches`);
      setMatches(data);
      setShowMatches(true);
    } catch (e) {
      alert(e.response?.data?.message || "Failed to load matches");
    } finally {
      setMatchLoading(false);
    }
  };

  const handleRerun = async () => {
    setRerunning(true);
    try {
      await API.post(`/jobs/${id}/matches/rerun`);
      await loadMatches(); // reload fresh data
    } catch (e) {
      alert(e.response?.data?.message || "Rerun failed");
    } finally {
      setRerunning(false);
    }
  };

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

  const dl = job.deadline
    ? Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

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

            {/* Structured skills section */}
            {job.skillsRequired?.length > 0 && (
              <div className="job-detail-section">
                <h2>Skills Required</h2>
                <div className="job-skills-wrap">
                  {job.skillsRequired.map((s, i) => (
                    <span key={i} className="job-skill-tag" style={{ fontSize: "0.875rem", padding: "0.3rem 0.8rem" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Top Matched Candidates panel (poster + admin only) ── */}
            {canManage && (
              <div className="job-detail-section">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <h2 style={{ margin: 0 }}>🎯 Top Matched Candidates</h2>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {user?.role === "admin" && matches && (
                      <button
                        onClick={handleRerun}
                        disabled={rerunning}
                        style={{ padding: "0.35rem 0.9rem", background: "#f1f5f9", border: "1.5px solid #cbd5e1", borderRadius: "7px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
                      >
                        {rerunning ? "Re-running…" : "🔄 Re-run Matching"}
                      </button>
                    )}
                    <button
                      onClick={showMatches ? () => setShowMatches(false) : loadMatches}
                      disabled={matchLoading}
                      style={{ padding: "0.35rem 1rem", background: "#0f3460", color: "#fff", border: "none", borderRadius: "7px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      {matchLoading ? "Loading…" : showMatches ? "Hide Matches" : "View Matches"}
                    </button>
                  </div>
                </div>

                {showMatches && matches && (
                  <>
                    <p style={{ fontSize: "0.85rem", color: "#888", marginBottom: "0.75rem" }}>
                      {matches.totalMatched} student{matches.totalMatched !== 1 ? "s" : ""} matched — ranked by skill + level score.
                      Students were notified via in-app notification and email when this job was posted.
                    </p>

                    {matches.totalMatched === 0 ? (
                      <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "1.5rem", textAlign: "center", color: "#888" }}>
                        <span style={{ fontSize: "2rem" }}>🔍</span>
                        <p style={{ marginTop: "0.5rem" }}>No students match the required skills yet.</p>
                        <p style={{ fontSize: "0.82rem" }}>Students who add matching skills to their profiles will appear here.</p>
                      </div>
                    ) : (
                      <div className="matched-students-list">
                        {matches.matchedStudents.map((s, i) => (
                          <div key={s.studentId} className="matched-student-row">
                            <div className="matched-rank">#{i + 1}</div>
                            <div className="matched-info">
                              <div className="matched-name">{s.fullName}</div>
                              <div className="matched-meta">
                                <span>🎓 {s.branch}</span>
                                {s.cgpa && <span>· CGPA {Number(s.cgpa).toFixed(1)}</span>}
                              </div>
                            </div>
                            <ScoreBadge score={s.score} matchedCount={s.matchedCount} />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {!showMatches && (
                  <p style={{ fontSize: "0.85rem", color: "#888", margin: 0 }}>
                    Click "View Matches" to see students ranked by skill compatibility for this posting.
                  </p>
                )}
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
              {job.skillsRequired?.length > 0 && (
                <div className="job-info-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.4rem" }}>
                  <span className="job-info-label">Skills Required</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.1rem" }}>
                    {job.skillsRequired.map((s, i) => (
                      <span key={i} style={{
                        background: "#e0e7ff", color: "#3730a3",
                        borderRadius: "12px", padding: "0.15rem 0.6rem",
                        fontSize: "0.75rem", fontWeight: 700,
                      }}>{s}</span>
                    ))}
                  </div>
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