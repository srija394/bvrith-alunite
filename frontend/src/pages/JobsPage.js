import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./Jobs.css";

const MODES = ["remote", "onsite", "hybrid"];

function daysLeft(deadline) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function JobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canPost = user?.role === "alumni" || user?.role === "admin";

  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [page, setPage] = useState(1);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search.trim()) params.set("search", search.trim());
      if (typeFilter) params.set("type", typeFilter);
      if (modeFilter) params.set("mode", modeFilter);
      const { data } = await API.get(`/jobs?${params}`);
      setJobs(data.jobs);
      setPagination(data.pagination);
    } catch {
      setError("Failed to load jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, modeFilter, page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleDelete = async (jobId, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this posting?")) return;
    try {
      await API.delete(`/jobs/${jobId}`);
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
    } catch {
      alert("Failed to delete");
    }
  };

  const dashboardLink = user?.role === "alumni" ? "/dashboard/alumni" : "/dashboard/student";

  return (
    <>
      <Navbar />
      <div className="jobs-container">

        {/* Header */}
        <div className="jobs-header">
          <div>
            <h1>💼 Jobs & Internships</h1>
            <p>Opportunities posted by BVRITH alumni — for BVRITH students</p>
          </div>
          <div className="jobs-header-actions">
            <button className="btn-back" onClick={() => navigate(dashboardLink)}>← Dashboard</button>
            {canPost && (
              <button className="btn-create-job" onClick={() => setShowCreate(true)}>
                + Post a Job
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="jobs-filters">
          <input
            className="jobs-search"
            placeholder="Search by title, company, or skill..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <div className="type-toggle">
            <button className={typeFilter === "" ? "active" : ""} onClick={() => { setTypeFilter(""); setPage(1); }}>All</button>
            <button className={typeFilter === "job" ? "active" : ""} onClick={() => { setTypeFilter("job"); setPage(1); }}>Jobs</button>
            <button className={typeFilter === "internship" ? "active" : ""} onClick={() => { setTypeFilter("internship"); setPage(1); }}>Internships</button>
          </div>
          <select className="filter-select" value={modeFilter} onChange={(e) => { setModeFilter(e.target.value); setPage(1); }}>
            <option value="">All Modes</option>
            {MODES.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
          {pagination && <span className="jobs-count">{pagination.total} posting{pagination.total !== 1 ? "s" : ""}</span>}
        </div>

        {/* Content */}
        {loading ? (
          <div className="jobs-loading">
            <div className="ev-spinner" />
            <p>Loading opportunities...</p>
          </div>
        ) : error ? (
          <div className="jobs-error">{error}</div>
        ) : jobs.length === 0 ? (
          <div className="jobs-empty">
            <span>📭</span>
            <p>No postings found.{canPost && " Be the first to post an opportunity!"}</p>
          </div>
        ) : (
          <>
            <div className="jobs-grid">
              {jobs.map((job) => {
                const dl = daysLeft(job.deadline);
                const isOwner = job.postedBy?._id === user?.id || job.postedBy === user?.id;
                const canManage = isOwner || user?.role === "admin";
                return (
                  <div key={job._id} className="job-card" onClick={() => navigate(`/jobs/${job._id}`)}>
                    <div className="job-card-top">
                      <h3>{job.title}</h3>
                      <span className={`job-type-badge ${job.type}`}>{job.type}</span>
                    </div>
                    <p className="job-company">🏢 {job.company}</p>

                    <div className="job-meta">
                      {job.location && <span className="job-meta-item">📍 {job.location}</span>}
                      <span className="job-meta-item">💻 {job.mode}</span>
                      {job.stipend && <span className="job-meta-item">💰 {job.stipend}</span>}
                      {job.salary && <span className="job-meta-item">💰 {job.salary}</span>}
                      {job.duration && <span className="job-meta-item">⏱ {job.duration}</span>}
                    </div>

                    <p className="job-desc">{job.description}</p>

                    {job.skillsRequired?.length > 0 && (
                      <div className="job-skills">
                        {job.skillsRequired.slice(0, 4).map((s) => (
                          <span key={s} className="job-skill-tag">{s}</span>
                        ))}
                        {job.skillsRequired.length > 4 && (
                          <span className="job-skill-tag">+{job.skillsRequired.length - 4}</span>
                        )}
                      </div>
                    )}

                    <div className="job-card-footer">
                      <span className="job-poster">Posted by {job.posterName}</span>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        {dl !== null && (
                          <span className={`job-deadline ${dl >= 7 ? "safe" : ""}`}>
                            {dl > 0 ? `${dl}d left` : "Expired"}
                          </span>
                        )}
                        {canManage && (
                          <button
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "0.9rem" }}
                            onClick={(e) => handleDelete(job._id, e)}
                            title="Delete posting"
                          >🗑️</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "2rem" }}>
                <button className="btn-back" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
                <span style={{ padding: "0.45rem 1rem", color: "#555" }}>Page {page} of {pagination.totalPages}</span>
                <button className="btn-back" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateJobModal
          onClose={() => setShowCreate(false)}
          onCreated={(job) => { setJobs((prev) => [job, ...prev]); setShowCreate(false); }}
        />
      )}
    </>
  );
}

function CreateJobModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "", company: "", type: "internship", location: "",
    mode: "onsite", description: "", skillsRequired: "",
    stipend: "", salary: "", duration: "", applyLink: "", deadline: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...form,
        skillsRequired: form.skillsRequired
          ? form.skillsRequired.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        deadline: form.deadline || null,
      };
      const { data } = await API.post("/jobs", payload);
      onCreated(data.job);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-job-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💼 Post an Opportunity</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="create-event-form">
          <div className="form-row two-col">
            <div className="form-group">
              <label>Job Title *</label>
              <input value={form.title} onChange={set("title")} required placeholder="e.g. Frontend Developer" />
            </div>
            <div className="form-group">
              <label>Company *</label>
              <input value={form.company} onChange={set("company")} required placeholder="e.g. Google" />
            </div>
          </div>

          <div className="form-row two-col">
            <div className="form-group">
              <label>Type *</label>
              <select value={form.type} onChange={set("type")}>
                <option value="internship">Internship</option>
                <option value="job">Full-time Job</option>
              </select>
            </div>
            <div className="form-group">
              <label>Mode</label>
              <select value={form.mode} onChange={set("mode")}>
                <option value="onsite">Onsite</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div className="form-row two-col">
            <div className="form-group">
              <label>Location</label>
              <input value={form.location} onChange={set("location")} placeholder="e.g. Hyderabad" />
            </div>
            <div className="form-group">
              <label>Application Deadline</label>
              <input type="date" value={form.deadline} onChange={set("deadline")} min={new Date().toISOString().split("T")[0]} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full">
              <label>Description *</label>
              <textarea value={form.description} onChange={set("description")} required rows={4} maxLength={3000} placeholder="Describe the role, responsibilities, and requirements..." />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group full">
              <label>Skills Required <span style={{ color: "#888", fontWeight: 400 }}>(comma-separated)</span></label>
              <input value={form.skillsRequired} onChange={set("skillsRequired")} placeholder="e.g. React, Node.js, MongoDB" />
            </div>
          </div>

          <div className="form-row two-col">
            {form.type === "internship" ? (
              <>
                <div className="form-group">
                  <label>Stipend</label>
                  <input value={form.stipend} onChange={set("stipend")} placeholder="e.g. ₹15,000/month" />
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <input value={form.duration} onChange={set("duration")} placeholder="e.g. 3 months" />
                </div>
              </>
            ) : (
              <div className="form-group">
                <label>Salary / CTC</label>
                <input value={form.salary} onChange={set("salary")} placeholder="e.g. ₹8 LPA" />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group full">
              <label>Apply Link</label>
              <input value={form.applyLink} onChange={set("applyLink")} placeholder="https://careers.company.com/apply/..." />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Posting..." : "Post Opportunity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
