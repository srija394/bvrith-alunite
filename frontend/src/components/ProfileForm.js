import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./ProfileForm.css";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AIDS", "AIML", "CSD"];

export default function ProfileForm({ initial = {}, onSubmit, loading }) {
  const { user } = useAuth();
  const isAlumni = user?.role === "alumni";

  const [form, setForm] = useState({
    fullName: "",
    rollNumber: "",
    branch: "",
    phone: "",
    linkedIn: "",
    github: "",
    bio: "",
    skills: "",
    profilePhoto: "",
    // student only
    year: "",
    section: "",
    // alumni only
    graduationYear: "",
    currentCompany: "",
    currentRole: "",
    location: "",
    isAvailableForMentorship: false,
    ...initial,
    skills: Array.isArray(initial.skills) ? initial.skills.join(", ") : (initial.skills || ""),
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
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
          <label>Skills <span className="hint">(comma-separated)</span></label>
          <input name="skills" value={form.skills} onChange={handleChange} placeholder="React, Node.js, Python, MongoDB" />
        </div>

        {/* ── Bio ── */}
        <div className="form-group full-width">
          <label>Bio <span className="hint">(max 500 chars)</span></label>
          <textarea name="bio" value={form.bio} onChange={handleChange} rows={3} maxLength={500} placeholder="A short description about yourself..." />
          <span className="char-count">{form.bio.length}/500</span>
        </div>

        {/* ── Alumni mentorship toggle ── */}
        {isAlumni && (
          <div className="form-group full-width">
            <label className="checkbox-label">
              <input type="checkbox" name="isAvailableForMentorship" checked={form.isAvailableForMentorship} onChange={handleChange} />
              I'm available for mentoring students
            </label>
          </div>
        )}
      </div>

      <button type="submit" className="btn-save" disabled={loading}>
        {loading ? "Saving..." : "Save Profile"}
      </button>
    </form>
  );
}
