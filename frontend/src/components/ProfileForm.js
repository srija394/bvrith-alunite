import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./ProfileForm.css";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AIDS", "AIML", "CSD"];
const LEVELS   = ["Beginner", "Intermediate", "Advanced"];

// ── Skill builder — used only for student profiles ──────────────────────────
function SkillBuilder({ skills, onChange }) {
  const [newName,  setNewName]  = useState("");
  const [newLevel, setNewLevel] = useState("Beginner");

  const addSkill = () => {
    const name = newName.trim();
    if (!name) return;
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return; // dedupe
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
      {/* Existing skills */}
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

      {/* Add new skill */}
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

// ── Main ProfileForm ─────────────────────────────────────────────────────────
export default function ProfileForm({ initial = {}, onSubmit, loading }) {
  const { user } = useAuth();
  const isAlumni = user?.role === "alumni";

  // Normalise incoming skills — could be [{name,level}] or ["React","Node"]
  const normaliseSkills = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.map((s) =>
      typeof s === "string" ? { name: s, level: "Beginner" } : s
    );
  };

  const [form, setForm] = useState({
    fullName: "",
    rollNumber: "",
    branch: "",
    phone: "",
    linkedIn: "",
    github: "",
    bio: "",
    profilePhoto: "",
    // student only
    year: "",
    section: "",
    cgpa: "",
    // alumni only
    graduationYear: "",
    currentCompany: "",
    currentRole: "",
    location: "",
    isAvailableForMentorship: false,
    availableForTalks: false,
    portfolioUrl: "",
    webinarTopics: "",
    ...initial,
    // Skills: always structured array for students, plain string comma-list for alumni
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
      // Students send [{name, level}]; alumni send plain string array (backwards compat)
      skills: isAlumni
        ? form.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : form.skills, // already structured array
      webinarTopics: form.webinarTopics
        ? form.webinarTopics.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };
    onSubmit(payload);
  };

  return (
    <form className="profile-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        {/* ── Common fields ── */}
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

        {/* ── Student-only fields ── */}
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

        {/* ── Alumni-only fields ── */}
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

        {/* ── Social ── */}
        <div className="form-group">
          <label>LinkedIn URL</label>
          <input name="linkedIn" value={form.linkedIn} onChange={handleChange} placeholder="https://linkedin.com/in/..." />
        </div>
        <div className="form-group">
          <label>GitHub URL</label>
          <input name="github" value={form.github} onChange={handleChange} placeholder="https://github.com/..." />
        </div>
        <div className="form-group">
          <label>Profile Photo URL</label>
          <input name="profilePhoto" value={form.profilePhoto} onChange={handleChange} placeholder="https://..." />
        </div>

        {/* ── Skills ── */}
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

        {/* ── Bio ── */}
        <div className="form-group full-width">
          <label>Bio <span className="hint">(max 500 chars)</span></label>
          <textarea name="bio" value={form.bio} onChange={handleChange} rows={3} maxLength={500} placeholder="A short description about yourself..." />
          <span className="char-count">{(form.bio || "").length}/500</span>
        </div>

        {/* ── Alumni mentorship + talks toggles ── */}
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
