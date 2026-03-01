import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import "./Auth.css";

export default function GoogleRoleSelect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const { tempToken, email } = location.state || {};

  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!tempToken || !email) {
    navigate("/login", { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) return setError("Please select a role.");
    setLoading(true);
    setError("");
    try {
      const { data } = await API.post("/auth/google/set-role", { tempToken, role });
      login(data.token, data.role, data.email);
      if (data.role === "alumni") navigate("/dashboard/alumni");
      else navigate("/dashboard/student");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🎓</span>
          <h1>BVRITH Alunite</h1>
          <p>Alumni &amp; Student Portal</p>
        </div>

        <h2>One Last Step</h2>
        <p className="auth-subtitle">
          Welcome! You're signing in as <strong>{email}</strong>. Please select your role to complete registration.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>I am a…</label>
            <div className="role-picker">
              {[
                { value: "student", label: "🎒 Student", desc: "Currently enrolled at BVRITH" },
                { value: "alumni", label: "🎓 Alumni", desc: "Graduated from BVRITH" },
              ].map((r) => (
                <div
                  key={r.value}
                  className={`role-card ${role === r.value ? "selected" : ""}`}
                  onClick={() => setRole(r.value)}
                >
                  <span className="role-card-label">{r.label}</span>
                  <span className="role-card-desc">{r.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn-auth"
            disabled={loading || !role}
          >
            {loading ? "Setting up your account…" : "Continue →"}
          </button>
        </form>
      </div>
    </div>
  );
}
