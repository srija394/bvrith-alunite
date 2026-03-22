import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import "./Auth.css";

/* ── Google One-Tap helper ─────────────────────────────── */
function useGoogleSignIn(onToken) {
  useEffect(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId) return; // Google SSO disabled if no client ID configured

    // Dynamically load the Google Identity Services script
    if (!document.getElementById("google-gsi-script")) {
      const script = document.createElement("script");
      script.id = "google-gsi-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => initializeGoogle(clientId, onToken);
      document.head.appendChild(script);
    } else if (window.google) {
      initializeGoogle(clientId, onToken);
    }
  }, [onToken]);
}

function initializeGoogle(clientId, onToken) {
  if (!window.google) return;
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => onToken(response.credential),
  });
  window.google.accounts.id.renderButton(
    document.getElementById("google-signin-btn"),
    { theme: "outline", size: "large", width: "100%", text: "signin_with" }
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await API.post("/auth/login", form);
      login(data.token, data.role, form.email, data.mustChangePassword);
      if (data.mustChangePassword) navigate("/change-password");
      else if (data.role === "admin") navigate("/dashboard/admin");
      else if (data.role === "alumni") navigate("/dashboard/alumni");
      else navigate("/dashboard/student");
    } catch (err) {
      const data = err.response?.data;
      if (data?.needsVerification) {
        navigate("/verify-otp", { state: { email: data.email } });
        return;
      }
      setError(data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleToken = async (idToken) => {
    setGoogleLoading(true);
    setError("");
    try {
      const { data } = await API.post("/auth/google", { idToken });
      if (data.needsRoleSelection) {
        navigate("/google/select-role", {
          state: { tempToken: data.tempToken, email: data.email },
        });
        return;
      }
      login(data.token, data.role, data.email, data.mustChangePassword);
      if (data.mustChangePassword) navigate("/change-password");
      else if (data.role === "admin") navigate("/dashboard/admin");
      else if (data.role === "alumni") navigate("/dashboard/alumni");
      else navigate("/dashboard/student");
    } catch (err) {
      setError(err.response?.data?.message || "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  };

  useGoogleSignIn(handleGoogleToken);

  const googleEnabled = !!process.env.REACT_APP_GOOGLE_CLIENT_ID;

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🎓</span>
          <h1>BVRITH Alunite</h1>
          <p>Alumni &amp; Student Portal</p>
        </div>

        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to your account</p>

        {error && <div className="auth-error">{error}</div>}
        {googleLoading && <div className="auth-info">Completing Google sign-in…</div>}

        {/* Google Sign-In Button (rendered by GSI library or fallback) */}
        {googleEnabled && (
          <>
            <div id="google-signin-btn" className="google-btn-container" />
            <div className="auth-divider"><span>or sign in with email</span></div>
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
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="auth-switch" style={{ color: "#888", fontSize: "0.82rem" }}>
          Contact your admin if you need an account.
        </p>
      </div>
    </div>
  );
}