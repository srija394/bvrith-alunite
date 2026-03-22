import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../utils/api";
import "./Auth.css";

export default function ChangePassword() {
  const { user, clearMustChangePassword, logout } = useAuth();
  const navigate = useNavigate();
  const isForced = user?.mustChangePassword;

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.newPassword.length < 6)
      return setError("New password must be at least 6 characters");
    if (form.newPassword !== form.confirmPassword)
      return setError("Passwords do not match");
    if (!isForced && !form.currentPassword)
      return setError("Please enter your current password");

    setLoading(true);
    try {
      const payload = { newPassword: form.newPassword };
      if (!isForced) payload.currentPassword = form.currentPassword;

      const { data } = await API.put("/auth/change-password", payload);
      clearMustChangePassword(data.token);
      setSuccess("Password changed successfully! Redirecting...");

      setTimeout(() => {
        if (user.role === "admin") navigate("/dashboard/admin");
        else if (user.role === "alumni") navigate("/dashboard/alumni");
        else navigate("/dashboard/student");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="logo-icon">🔐</span>
          <h1>BVRITH Alunite</h1>
          <p>Alumni &amp; Student Portal</p>
        </div>

        {isForced ? (
          <>
            <h2>Set Your Password</h2>
            <p className="auth-subtitle">
              Your account was created by the admin. Please set a new password before continuing.
            </p>
          </>
        ) : (
          <>
            <h2>Change Password</h2>
            <p className="auth-subtitle">Update your account password</p>
          </>
        )}

        {error   && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Only show current password field if NOT a forced change */}
          {!isForced && (
            <div className="form-group">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                type="password"
                name="currentPassword"
                placeholder="Enter your current password"
                value={form.currentPassword}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              name="newPassword"
              placeholder="Min. 6 characters"
              value={form.newPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="Re-enter new password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Saving..." : "Set New Password"}
          </button>
        </form>

        {/* Allow logging out even from the forced change screen */}
        <p className="auth-switch">
          Wrong account?{" "}
          <span
            style={{ color: "#e94560", cursor: "pointer", textDecoration: "underline" }}
            onClick={logout}
          >
            Sign out
          </span>
        </p>
      </div>
    </div>
  );
}