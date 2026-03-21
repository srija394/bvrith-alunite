import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import "./AlumniDirectory.css";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AIDS", "AIML", "CSD"];

export default function AlumniDirectory() {
  const navigate = useNavigate();

  // ── Filter state
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [page, setPage] = useState(1);

  // ── Data state
  const [alumni, setAlumni] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ years: [], skills: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Load filter dropdown options once
  useEffect(() => {
    API.get("/profile/alumni/filters")
      .then((res) => setFilterOptions(res.data))
      .catch(() => {});
  }, []);

  // ── Fetch alumni whenever filters/page change
  const fetchAlumni = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (branch) params.set("branch", branch);
      if (graduationYear) params.set("graduationYear", graduationYear);
      if (selectedSkills.length) params.set("skills", selectedSkills.join(","));
      params.set("page", page);
      params.set("limit", 12);

      const { data } = await API.get(`/profile/alumni/all?${params}`);
      setAlumni(data.profiles);
      setPagination(data.pagination);
    } catch {
      setError("Failed to load alumni. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, branch, graduationYear, selectedSkills, page]);

  useEffect(() => {
    fetchAlumni();
  }, [fetchAlumni]);

  // Reset to page 1 when filters change
  const resetPage = () => setPage(1);

  const addSkill = (skill) => {
    if (skill && !selectedSkills.includes(skill)) {
      setSelectedSkills((prev) => [...prev, skill]);
      setSkillInput("");
      resetPage();
    }
  };

  const removeSkill = (skill) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skill));
    resetPage();
  };

  const clearAllFilters = () => {
    setSearch("");
    setBranch("");
    setGraduationYear("");
    setSelectedSkills([]);
    setSkillInput("");
    setPage(1);
  };

  const hasActiveFilters = search || branch || graduationYear || selectedSkills.length;

  return (
    <>
      <Navbar />
      <div className="directory-container">

        {/* ── Header ── */}
        <div className="directory-header">
          <div>
            <h1>🎓 Alumni Directory</h1>
            <p>Connect with BVRITH graduates across all batches and branches</p>
          </div>
          {pagination && (
            <span className="total-count">{pagination.total} Alumni</span>
          )}
        </div>

        {/* ── Search + Filters ── */}
        <div className="filters-card">
          {/* Search bar */}
          <div className="search-bar-wrapper">
            <span className="search-icon">🔍</span>
            <input
              className="search-bar"
              type="text"
              placeholder="Search by name, company, role, or location..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            />
            {search && (
              <button className="clear-search" onClick={() => { setSearch(""); resetPage(); }}>✕</button>
            )}
          </div>

          {/* Filter row */}
          <div className="filter-row">
            <select
              value={branch}
              onChange={(e) => { setBranch(e.target.value); resetPage(); }}
              className="filter-select"
            >
              <option value="">All Branches</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>

            <select
              value={graduationYear}
              onChange={(e) => { setGraduationYear(e.target.value); resetPage(); }}
              className="filter-select"
            >
              <option value="">All Batches</option>
              {filterOptions.years.map((y) => (
                <option key={y} value={y}>Batch {y}</option>
              ))}
            </select>

            {/* Skill filter */}
            <div className="skill-filter">
              <input
                type="text"
                placeholder="Filter by skill..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSkill(skillInput)}
                className="filter-select skill-input"
                list="skill-suggestions"
              />
              <datalist id="skill-suggestions">
                {filterOptions.skills
                  .filter((s) => !selectedSkills.includes(s))
                  .map((s) => <option key={s} value={s} />)}
              </datalist>
              <button className="btn-add-skill" onClick={() => addSkill(skillInput)}>+</button>
            </div>

            {hasActiveFilters && (
              <button className="btn-clear-filters" onClick={clearAllFilters}>
                Clear All
              </button>
            )}
          </div>

          {/* Active skill tags */}
          {selectedSkills.length > 0 && (
            <div className="active-skills">
              {selectedSkills.map((s) => (
                <span key={s} className="active-skill-tag">
                  {s}
                  <button onClick={() => removeSkill(s)}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Results ── */}
        {error && <div className="dir-error">{error}</div>}

        {loading ? (
          <div className="dir-loading">
            <div className="spinner" />
            <p>Searching alumni...</p>
          </div>
        ) : alumni.length === 0 ? (
          <div className="dir-empty">
            <span>🔎</span>
            <p>No alumni found matching your filters.</p>
            {hasActiveFilters && (
              <button className="btn-clear-filters" onClick={clearAllFilters}>Clear Filters</button>
            )}
          </div>
        ) : (
          <>
            <div className="alumni-grid">
              {alumni.map((a) => (
                <AlumniCard key={a._id} alumni={a} navigate={navigate} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="page-btn"
                >
                  ← Prev
                </button>
                <div className="page-numbers">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 2)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`ellipsis-${i}`} className="ellipsis">…</span>
                      ) : (
                        <button
                          key={p}
                          className={`page-btn ${p === page ? "active" : ""}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      )
                    )}
                </div>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="page-btn"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function AlumniCard({ alumni, navigate }) {
  const initials = alumni.fullName
    ? alumni.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="alumni-card" onClick={() => navigate(`/alumni/${alumni.user?._id || alumni._id}`)}>
      <div className="card-top">
        <div className="card-avatar">
          {alumni.profilePhoto
            ? <img src={alumni.profilePhoto} alt={alumni.fullName} />
            : <span>{initials}</span>
          }
        </div>
        <div className="card-info">
          <h3>{alumni.fullName}</h3>
          <p className="card-role">
            {alumni.currentRole
              ? `${alumni.currentRole}${alumni.currentCompany ? ` @ ${alumni.currentCompany}` : ""}`
              : alumni.currentCompany || "—"
            }
          </p>
          {alumni.location && <p className="card-location">📍 {alumni.location}</p>}
        </div>
      </div>

      <div className="card-meta">
        <span className="meta-badge branch">{alumni.branch}</span>
        <span className="meta-badge year">Batch {alumni.graduationYear}</span>
        {alumni.isAvailableForMentorship && (
          <span className="meta-badge mentor">Mentoring ✅</span>
        )}
        {alumni.availableForTalks && (
          <span className="meta-badge" style={{background:"#ede9fe",color:"#5b21b6",border:"1px solid #ddd6fe"}}>🎤 Talks</span>
        )}
      </div>

      {alumni.skills?.length > 0 && (
        <div className="card-skills">
          {alumni.skills.slice(0, 4).map((s, i) => {
            const name = typeof s === "object" ? s.name : s;
            return <span key={i} className="card-skill">{name}</span>;
          })}
          {alumni.skills.length > 4 && (
            <span className="card-skill more">+{alumni.skills.length - 4}</span>
          )}
        </div>
      )}

      <div className="card-links">
        {alumni.linkedIn && (
          <a href={alumni.linkedIn} target="_blank" rel="noreferrer"
            onClick={(e) => e.stopPropagation()}>🔗 LinkedIn</a>
        )}
        {alumni.github && (
          <a href={alumni.github} target="_blank" rel="noreferrer"
            onClick={(e) => e.stopPropagation()}>🐙 GitHub</a>
        )}
        {alumni.portfolioUrl && (
          <a href={alumni.portfolioUrl} target="_blank" rel="noreferrer"
            onClick={(e) => e.stopPropagation()}>🌐 Portfolio</a>
        )}
      </div>
    </div>
  );
}
