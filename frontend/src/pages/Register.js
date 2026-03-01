import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import "./Auth.css";

function initializeGoogleRegister(clientId, onToken) {
  if (!window.google) return;
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => onToken(response.credential),
  });
  window.google.accounts.id.renderButton(
    document.getElementById("google-register-btn"),
    { theme: "outline", size: "large", width: "100%", text: "signup_with" }
  );
}

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
    adminCode: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (name === "role") {
      setShowAdminCode(value === "admin");
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword)
      return setError("Passwords do not match");

    if (form.password.length < 6)
      return setError("Password must be at least 6 characters");

    if (form.role === "admin" && !form.adminCode.trim())
      return setError("Admin secret code is required");

    setLoading(true);
    try {
      await API.post("/auth/register", {
        email: form.email,
        password: form.password,
        role: form.role,
        adminCode: form.adminCode,
      });
      setSuccess("OTP sent to your email! Redirecting...");
      setTimeout(() => navigate("/verify-otp", { state: { email: form.email } }), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const googleEnabled = !!process.env.REACT_APP_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    if (!document.getElementById("google-gsi-script")) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => initializeGoogleRegister(clientId, handleGoogleToken);
      document.head.appendChild(script);
    } else if (window.google) {
      initializeGoogleRegister(clientId, handleGoogleToken);
    }
  // eslint-disable-next-line
  }, []);

  const handleGoogleToken = async (idToken) => {
    setGoogleLoading(true);
    setError("");
    try {
      const { data } = await API.post("/auth/google", { idToken });
      if (data.needsRoleSelection) {
        navigate("/google/select-role", { state: { tempToken: data.tempToken, email: data.email } });
        return;
      }
      login(data.token, data.role, data.email);
      if (data.role === "alumni") navigate("/dashboard/alumni");
      else navigate("/dashboard/student");
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-up failed.");
    } finally {
      setGoogleLoading(false);
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

        <h2>Create Account</h2>
        <p className="auth-subtitle">Join the BVRITH community</p>

        {error   && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}
        {googleLoading && <div className="auth-info">Completing Google sign-up…</div>}

        {googleEnabled && (
          <>
            <div id="google-register-btn" className="google-btn-container" />
            <div className="auth-divider"><span>or register with email</span></div>
          </>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="you@bvrith.edu"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">I am a...</label>
            <select id="role" name="role" value={form.role} onChange={handleChange}>
              <option value="student">Student</option>
              <option value="alumni">Alumni</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Admin secret code — only shown when Admin is selected */}
          {showAdminCode && (
            <div className="form-group admin-code-group">
              <label htmlFor="adminCode">🔐 Admin Secret Code</label>
              <input
                id="adminCode"
                type="password"
                name="adminCode"
                placeholder="Enter secret code provided by institution"
                value={form.adminCode}
                onChange={handleChange}
                autoComplete="off"
              />
              <span className="admin-code-hint">
                This code is provided by your institution's IT department
              </span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}