import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../utils/api";
import "./VerifyOTP.css";

export default function VerifyOTP() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) { navigate("/register"); return; }
    const timer = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [email]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = ["", "", "", "", "", ""];
    pasted.split("").forEach((char, i) => { newOtp[i] = char; });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) { setError("Please enter all 6 digits"); return; }
    setLoading(true); setError("");
    try {
      await API.post("/auth/verify-otp", { email, otp: code });
      setSuccess("Email verified successfully! Redirecting to login...");
      setTimeout(() => navigate("/login", { state: { verified: true } }), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true); setError("");
    try {
      await API.post("/auth/resend-otp", { email });
      setSuccess("New OTP sent! Check your inbox.");
      setCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend. Try again.");
    } finally { setResending(false); }
  };

  if (!email) return null;

  const filled = otp.filter(Boolean).length;

  return (
    <div className="otp-wrapper">
      <div className="otp-card">

        {/* Brand */}
        <div className="otp-brand">
          <span className="otp-brand-icon">🎓</span>
          <h1>BVRITH Alunite</h1>
          <p>Alumni &amp; Student Portal</p>
        </div>

        {/* Title */}
        <div className="otp-title-block">
          <div className="otp-shield">✉️</div>
          <h2>Verify Your Email</h2>
          <p className="otp-desc">
            We sent a 6-digit OTP to
          </p>
          <div className="otp-email-pill">{email}</div>
        </div>

        {/* Alerts */}
        {error   && <div className="otp-alert error">⚠️ {error}</div>}
        {success && <div className="otp-alert success">✅ {success}</div>}

        {/* OTP Boxes */}
        <form onSubmit={handleVerify}>
          <div className="otp-boxes" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`otp-digit ${digit ? "has-value" : ""} ${error ? "has-error" : ""}`}
                autoFocus={i === 0}
                autoComplete="off"
              />
            ))}
          </div>

          {/* Progress dots */}
          <div className="otp-progress">
            {otp.map((d, i) => (
              <div key={i} className={`otp-dot ${d ? "filled" : ""}`} />
            ))}
          </div>

          <button
            type="submit"
            className="otp-btn-verify"
            disabled={loading || filled < 6 || !!success}
          >
            {loading ? (
              <span className="btn-spinner-wrap"><span className="btn-spinner" /> Verifying...</span>
            ) : (
              `Verify Email ${filled < 6 ? `(${filled}/6)` : "✓"}`
            )}
          </button>
        </form>

        {/* Expiry note */}
        <p className="otp-expiry">OTP expires in 10 minutes</p>

        {/* Resend */}
        <div className="otp-resend-block">
          {countdown > 0 ? (
            <p className="otp-countdown">
              Didn't receive it? Resend in <strong>{countdown}s</strong>
              <span className="otp-countdown-bar">
                <span className="otp-countdown-fill" style={{ width: `${(countdown / 60) * 100}%` }} />
              </span>
            </p>
          ) : (
            <button className="otp-btn-resend" onClick={handleResend} disabled={resending}>
              {resending ? "Sending..." : "🔁 Resend OTP"}
            </button>
          )}
        </div>

        {/* Back */}
        <button className="otp-btn-back" onClick={() => navigate("/register")}>
          ← Back to Register
        </button>

      </div>
    </div>
  );
}