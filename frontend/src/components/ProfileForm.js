import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import "./ProfileForm.css";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AIDS", "AIML", "CSD"];
const LEVELS   = ["Beginner", "Intermediate", "Advanced"];

function SkillBuilder({ skills, onChange }) {
  const [newName,  setNewName]  = useState("");
  const [newLevel, setNewLevel] = useState("Beginner");

  const addSkill = () => {
    const name = newName.trim();
    if (!name) return;
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    onChange([...skills, { name, level: newLevel }]);
    setNewName("");
    setNewLevel("Beginner");
  };

  const removeSkill = (idx) => onChange(skills.filter((_, i) => i !== idx));
  const updateLevel = (idx, level) =>
    onChange(skills.map((s, i) => (i === idx ? { ...s, level } : s)));

  const levelColor = { Beginner: "#3b82f6", Intermediate: "#f59e0b", Advanced: "#16a34a" };

  return (
    <div className="skill-builder">
      {skills.length > 0 && (
        <div className="skill-tags-wrap">
          {skills.map((sk, i) => (
            <div key={i} className="skill-tag-row">
              <span className="skill-tag-name">{sk.name}</span>
              <select
                className="skill-level-select"
                value={sk.level}
                onChange={(e) => updateLevel(i, e.target.value)}
                style={{ borderColor: levelColor[sk.level] }}
              >
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <button type="button" className="skill-remove-btn" onClick={() => removeSkill(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="skill-add-row">
        <input
          className="skill-name-input"
          placeholder="Skill name (e.g. React, DSA)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
        />
        <select
          className="skill-level-select"
          value={newLevel}
          onChange={(e) => setNewLevel(e.target.value)}
        >
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <button type="button" className="skill-add-btn" onClick={addSkill}>+ Add</button>
      </div>
    </div>
  );
}

export default function ProfileForm({ initial = {}, onSubmit, loading }) {
  const { user } = useAuth();
  const isAlumni = user?.role === "alumni";

  // Fetch profile photo from My Files (signed S3 URL)
  const [photoUrl, setPhotoUrl] = useState(null);
  useEffect(() => {
    API.get("/upload/my-files")
      .then((res) => { if (res.data.photo?.url) setPhotoUrl(res.data.photo.url); })
      .catch(() => {});
  }, []);

  const normaliseSkills = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.map((s) => typeof s === "string" ? { name: s, level: "Beginner" } : s);
  };

  const [form, setForm] = useState({
    fullName: "",
    rollNumber: "",
    branch: "",
    phone: "",
    linkedIn: "",
    github: "",
    bio: "",
    year: "",
    section: "",
    cgpa: "",
    graduationYear: "",
    currentCompany: "",
    currentRole: "",
    location: "",
    isAvailableForMentorship: false,
    availableForTalks: false,
    portfolioUrl: "",
    webinarTopics: "",
    ...initial,
    skills: isAlumni
      ? (Array.isArray(initial.skills) ? initial.skills.join(", ") : (initial.skills || ""))
      : normaliseSkills(initial.skills),
    webinarTopics: Array.isArray(initial.webinarTopics)
      ? initial.webinarTopics.join(", ")
      : (initial.webinarTopics || ""),
    availableForTalks: initial.availableForTalks || false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      skills: isAlumni
        ? form.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : form.skills,
      webinarTopics: form.webinarTopics
        ? form.webinarTopics.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };
    onSubmit(payload);
  };

  return (
    <form className="profile-form" onSubmit={handleSubmit}>

      {/* ── Profile Photo Preview ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", marginBottom: "1.5rem", padding: "1rem", background: "#f0f4ff", borderRadius: "12px", border: "1.5px solid #dbeafe" }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "#0f3460", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "3px solid #fff", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
          {photoUrl
            ? <img src={photoUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 700 }}>{form.fullName?.[0]?.toUpperCase() || "?"}</span>
          }
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 600, color: "#1a1a2e", fontSize: "0.9rem" }}>Profile Photo</p>
          <p style={{ margin: "0.2rem 0 0", color: "#666", fontSize: "0.8rem" }}>
            {photoUrl
              ? "✅ Photo loaded from My Files"
              : "No photo yet — go to ☁️ My Files to upload one."}
          </p>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Full Name *</label>
          <input name="fullName" value={form.fullName} onChange={handleChange} required placeholder="e.g. Srija Reddy" />
        </div>

        <div className="form-group">
          <label>Roll Number</label>
          <input name="rollNumber" value={form.rollNumber} onChange={handleChange} placeholder="e.g. 22WH1A12B7" />
        </div>

        <div className="form-group">
          <label>Branch *</label>
          <select name="branch" value={form.branch} onChange={handleChange} required>
            <option value="">Select Branch</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="+91 9876543210" />
        </div>

        {!isAlumni && (
          <>
            <div className="form-group">
              <label>Year *</label>
              <select name="year" value={form.year} onChange={handleChange} required>
                <option value="">Select Year</option>
                {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Section</label>
              <input name="section" value={form.section} onChange={handleChange} placeholder="e.g. A" />
            </div>
            <div className="form-group">
              <label>CGPA</label>
              <input type="number" name="cgpa" value={form.cgpa} onChange={handleChange} step="0.1" min="0" max="10" placeholder="e.g. 8.5" />
            </div>
            <div className="form-group">
              <label>Expected Graduation Year</label>
              <input type="number" name="graduationYear" value={form.graduationYear} onChange={handleChange} placeholder="e.g. 2026" min="2020" max="2035" />
            </div>
          </>
        )}

        {isAlumni && (
          <>
            <div className="form-group">
              <label>Graduation Year *</label>
              <input type="number" name="graduationYear" value={form.graduationYear} onChange={handleChange} required placeholder="e.g. 2022" min="2000" max="2030" />
            </div>
            <div className="form-group">
              <label>Current Company</label>
              <input name="currentCompany" value={form.currentCompany} onChange={handleChange} placeholder="e.g. TCS" />
            </div>
            <div className="form-group">
              <label>Current Role</label>
              <input name="currentRole" value={form.currentRole} onChange={handleChange} placeholder="e.g. Software Engineer" />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Hyderabad, India" />
            </div>
          </>
        )}

        <div className="form-group">
          <label>LinkedIn URL</label>
          <input name="linkedIn" value={form.linkedIn} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
        </div>
        <div className="form-group">
          <label>GitHub URL</label>
          <input name="github" value={form.github} onChange={handleChange} placeholder="https://github.com/..." />
        </div>

        <div className="form-group full-width">
          {isAlumni ? (
            <>
              <label>Skills <span className="hint">(comma-separated)</span></label>
              <input name="skills" value={form.skills} onChange={handleChange} placeholder="React, Node.js, Python, MongoDB" />
            </>
          ) : (
            <>
              <label>
                Skills & Expertise
                <span className="hint"> — add each skill with your proficiency level</span>
              </label>
              <SkillBuilder
                skills={Array.isArray(form.skills) ? form.skills : []}
                onChange={(updated) => setForm((f) => ({ ...f, skills: updated }))}
              />
            </>
          )}
        </div>

        <div className="form-group full-width">
          <label>Bio <span className="hint">(max 500 chars)</span></label>
          <textarea name="bio" value={form.bio} onChange={handleChange} rows={3} maxLength={500} placeholder="A short description about yourself..." />
          <span className="char-count">{(form.bio || "").length}/500</span>
        </div>

        {isAlumni && (
          <>
            <div className="form-group full-width">
              <label className="checkbox-label">
                <input type="checkbox" name="isAvailableForMentorship" checked={form.isAvailableForMentorship} onChange={handleChange} />
                I'm available for mentoring students
              </label>
            </div>
            <div className="form-group full-width">
              <label className="checkbox-label">
                <input type="checkbox" name="availableForTalks" checked={form.availableForTalks || false} onChange={handleChange} />
                I'm available to give talks / webinars for students
              </label>
            </div>
            <div className="form-group">
              <label>Portfolio / Personal Website</label>
              <input name="portfolioUrl" value={form.portfolioUrl || ""} onChange={handleChange} placeholder="https://yourportfolio.com" />
            </div>
            <div className="form-group">
              <label>Webinar / Talk Topics <span style={{ color: "#888", fontWeight: 400 }}>(comma-separated)</span></label>
              <input name="webinarTopics" value={form.webinarTopics || ""} onChange={handleChange} placeholder="e.g. System Design, DSA, Cloud Computing" />
            </div>
          </>
        )}
      </div>

      <button type="submit" className="btn-save" disabled={loading}>
        {loading ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}