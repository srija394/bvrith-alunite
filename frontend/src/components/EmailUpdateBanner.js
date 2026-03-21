import React, { useState } from "react";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";

/**
 * EmailUpdateBanner
 *
 * Shown on the Alumni Dashboard when user.needsEmailUpdate === true.
 * Alumni can dismiss it (snooze, stored in sessionStorage) or submit
 * their personal email inline. On success the token is refreshed so
 * the banner disappears without a full page reload.
 */
export default function EmailUpdateBanner() {
  const { user, refreshUser, login } = useAuth();

  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("emailBannerDismissed") === "true"
  );

  // Don't render at all if the flag is off or user already dismissed for this session
  if (!user?.needsEmailUpdate || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem("emailBannerDismissed", "true");
    setDismissed(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await API.put("/auth/update-email", { newEmail: email });
      // Update stored token + context so banner vanishes immediately
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("email", res.data.email);
      localStorage.setItem("needsEmailUpdate", "false");
      // refreshUser syncs context from /api/auth/me; also update token via login helper
      login(res.data.token, user.role, res.data.email);
      await refreshUser();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to update email. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ── Styles (inline so no extra CSS file needed) ─────────────────── */
  const banner = {
    background: "#eff6ff",
    border: "1px solid #3b82f6",
    borderRadius: "10px",
    padding: "1rem 1.25rem",
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    position: "relative",
  };
  const iconStyle = { fontSize: "1.4rem", flexShrink: 0, marginTop: "2px" };
  const titleStyle = { color: "#1d4ed8", fontWeight: 700, fontSize: "0.95rem", margin: 0 };
  const bodyStyle = { color: "#1e40af", fontSize: "0.875rem", margin: "0.3rem 0 0" };
  const dismissBtn = {
    position: "absolute",
    top: "0.6rem",
    right: "0.75rem",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#93c5fd",
    fontSize: "1.1rem",
    lineHeight: 1,
  };
  const updateBtn = {
    marginTop: "0.5rem",
    padding: "0.35rem 0.9rem",
    borderRadius: "6px",
    border: "1.5px solid #3b82f6",
    background: "none",
    color: "#1d4ed8",
    fontWeight: 600,
    fontSize: "0.83rem",
    cursor: "pointer",
  };
  const inputStyle = {
    padding: "0.45rem 0.75rem",
    borderRadius: "6px",
    border: "1.5px solid #93c5fd",
    fontSize: "0.875rem",
    outline: "none",
    width: "260px",
    maxWidth: "100%",
  };
  const submitBtn = {
    padding: "0.45rem 1rem",
    borderRadius: "6px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.875rem",
    cursor: saving ? "not-allowed" : "pointer",
    opacity: saving ? 0.7 : 1,
  };
  const cancelBtn = {
    padding: "0.45rem 0.75rem",
    borderRadius: "6px",
    border: "1.5px solid #93c5fd",
    background: "none",
    color: "#6b7280",
    fontSize: "0.83rem",
    cursor: "pointer",
  };

  return (
    <div style={banner} role="alert" aria-live="polite">
      <span style={iconStyle}>📧</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={titleStyle}>Update your email address</p>
        <p style={bodyStyle}>
          Your account was converted from your college email. Update it to a
          personal address so you keep receiving notifications after graduation.
        </p>

        {!expanded ? (
          <button style={updateBtn} onClick={() => setExpanded(true)}>
            Update email
          </button>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}
          >
            <input
              type="email"
              style={inputStyle}
              placeholder="your@personal-email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <button type="submit" style={submitBtn} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              style={cancelBtn}
              onClick={() => { setExpanded(false); setError(""); }}
            >
              Cancel
            </button>

            {error && (
              <p style={{ width: "100%", margin: "0.25rem 0 0", color: "#dc2626", fontSize: "0.82rem" }}>
                ⚠️ {error}
              </p>
            )}
          </form>
        )}
      </div>

      {/* Dismiss for this session */}
      <button
        style={dismissBtn}
        onClick={handleDismiss}
        aria-label="Dismiss email update reminder"
        title="Remind me later"
      >
        ✕
      </button>
    </div>
  );
}
