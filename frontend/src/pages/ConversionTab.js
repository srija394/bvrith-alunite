// frontend/src/pages/ConversionTab.js
// Drop-in tab component for AdminDashboard — Bulk Student → Alumni Conversion
// Usage: import ConversionTab from "./ConversionTab";
//        then add {activeTab === "conversion" && <ConversionTab />} in AdminDashboard

import React, { useState } from "react";
import API from "../utils/api";

const BRANCHES = ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL", "AIDS", "AIML", "CSD"];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

export default function ConversionTab() {
  const [graduationYear, setGraduationYear] = useState(String(CURRENT_YEAR));
  const [branch, setBranch]                 = useState("");
  const [preview, setPreview]               = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [converting, setConverting]         = useState(false);
  const [rollingBack, setRollingBack]       = useState(false);
  const [result, setResult]                 = useState(null);
  const [error, setError]                   = useState("");
  const [activeSection, setActiveSection]   = useState("convert"); // "convert" | "history"
  const [history, setHistory]               = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [histYear, setHistYear]             = useState("");

  // ── Preview ──────────────────────────────────────────────────────────────
  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreview(null);
    setResult(null);
    setError("");
    try {
      const params = new URLSearchParams({ graduationYear });
      if (branch) params.set("branch", branch);
      const { data } = await API.get(`/conversion/preview?${params}`);
      setPreview(data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  // ── Convert ───────────────────────────────────────────────────────────────
  const handleConvert = async () => {
    if (!preview || preview.eligible === 0) return;
    const confirmed = window.confirm(
      `⚠️ You are about to convert ${preview.eligible} student(s) from the Class of ${graduationYear}` +
        (branch ? ` (${branch})` : "") +
        " to Alumni.\n\nThey will be set as PENDING APPROVAL and must upload graduation documents.\n\nProceed?"
    );
    if (!confirmed) return;

    setConverting(true);
    setError("");
    setResult(null);
    try {
      const body = { graduationYear: Number(graduationYear) };
      if (branch) body.branch = branch;
      const { data } = await API.post("/conversion/convert", body);
      setResult({ type: "success", ...data });
      setPreview(null);
    } catch (e) {
      const msg = e.response?.data?.message || "Conversion failed";
      setError(msg);
      if (e.response?.status === 409) {
        setError(msg + " Please run Preview again to see updated counts.");
      }
    } finally {
      setConverting(false);
    }
  };

  // ── Rollback ──────────────────────────────────────────────────────────────
  const handleRollback = async () => {
    const confirmed = window.confirm(
      `⚠️ ROLLBACK: This will revert converted alumni (Class of ${graduationYear}` +
        (branch ? `, ${branch}` : "") +
        ") back to students.\n\nOnly users who have NOT yet uploaded graduation documents will be affected.\n\nProceed?"
    );
    if (!confirmed) return;

    setRollingBack(true);
    setError("");
    setResult(null);
    try {
      const body = { graduationYear: Number(graduationYear) };
      if (branch) body.branch = branch;
      const { data } = await API.post("/conversion/rollback", body);
      setResult({ type: "rollback", ...data });
      setPreview(null);
    } catch (e) {
      setError(e.response?.data?.message || "Rollback failed");
    } finally {
      setRollingBack(false);
    }
  };

  // ── History ───────────────────────────────────────────────────────────────
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ page: 1, limit: 50 });
      if (histYear) params.set("graduationYear", histYear);
      const { data } = await API.get(`/conversion/history?${params}`);
      setHistory(data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🎓 Student → Alumni Conversion</h2>
          <p style={styles.subtitle}>
            Bulk-convert graduating students to alumni. Existing messages, mentorships, and
            achievements are preserved. Converted alumni must upload documents for admin approval.
          </p>
        </div>
        <div style={styles.sectionToggle}>
          <button
            style={{ ...styles.toggleBtn, ...(activeSection === "convert" ? styles.toggleActive : {}) }}
            onClick={() => setActiveSection("convert")}
          >
            ⚙️ Convert
          </button>
          <button
            style={{ ...styles.toggleBtn, ...(activeSection === "history" ? styles.toggleActive : {}) }}
            onClick={() => { setActiveSection("history"); loadHistory(); }}
          >
            📜 History
          </button>
        </div>
      </div>

      {/* ── CONVERT SECTION ─────────────────────────────────────────────── */}
      {activeSection === "convert" && (
        <>
          {/* Filters */}
          <div style={styles.filterCard}>
            <h3 style={styles.filterTitle}>Step 1 — Select Cohort</h3>
            <div style={styles.filterRow}>
              <div style={styles.filterGroup}>
                <label style={styles.label}>Graduation Year *</label>
                <select
                  style={styles.select}
                  value={graduationYear}
                  onChange={(e) => { setGraduationYear(e.target.value); setPreview(null); setResult(null); }}
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div style={styles.filterGroup}>
                <label style={styles.label}>Branch (optional)</label>
                <select
                  style={styles.select}
                  value={branch}
                  onChange={(e) => { setBranch(e.target.value); setPreview(null); setResult(null); }}
                >
                  <option value="">All Branches</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <button
                style={styles.btnPreview}
                onClick={handlePreview}
                disabled={previewLoading}
              >
                {previewLoading ? "⏳ Loading..." : "🔍 Preview Conversion"}
              </button>
            </div>
          </div>

          {/* Preview Results */}
          {preview && (
            <div style={styles.previewCard}>
              <h3 style={styles.filterTitle}>Step 2 — Review &amp; Confirm</h3>
              <div style={styles.previewStats}>
                <div style={{ ...styles.statBox, background: "#dbeafe" }}>
                  <div style={styles.statNum}>{preview.eligible}</div>
                  <div style={styles.statLbl}>Eligible to Convert</div>
                </div>
                <div style={{ ...styles.statBox, background: "#dcfce7" }}>
                  <div style={styles.statNum}>{preview.alreadyConverted}</div>
                  <div style={styles.statLbl}>Already Converted</div>
                </div>
                <div style={{ ...styles.statBox, background: "#fef9c3" }}>
                  <div style={styles.statNum}>{preview.graduationYear}</div>
                  <div style={styles.statLbl}>Class of</div>
                </div>
              </div>

              {preview.eligible > 0 ? (
                <>
                  <div style={styles.studentTableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.thead}>
                          <th style={styles.th}>#</th>
                          <th style={styles.th}>Full Name</th>
                          <th style={styles.th}>Roll Number</th>
                          <th style={styles.th}>Branch</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.students.map((s, i) => (
                          <tr key={s.userId} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                            <td style={styles.td}>{i + 1}</td>
                            <td style={styles.td}>{s.fullName}</td>
                            <td style={styles.td}>{s.rollNumber}</td>
                            <td style={styles.td}>{s.branch}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={styles.actionRow}>
                    <button
                      style={styles.btnConvert}
                      onClick={handleConvert}
                      disabled={converting}
                    >
                      {converting ? "⏳ Converting..." : `🎓 Convert ${preview.eligible} Student(s) to Alumni`}
                    </button>
                    <button
                      style={styles.btnRollback}
                      onClick={handleRollback}
                      disabled={rollingBack}
                    >
                      {rollingBack ? "⏳ Rolling back..." : "↩️ Rollback Previous Conversion"}
                    </button>
                  </div>
                </>
              ) : (
                <div style={styles.emptyState}>
                  ✅ No students eligible for conversion in this cohort.
                  {preview.alreadyConverted > 0 && ` (${preview.alreadyConverted} already converted)`}
                </div>
              )}
            </div>
          )}

          {/* Result banner */}
          {result && (
            <div style={{ ...styles.resultBanner, background: result.type === "rollback" ? "#fff7ed" : "#f0fdf4", borderColor: result.type === "rollback" ? "#fb923c" : "#22c55e" }}>
              {result.type === "rollback" ? (
                <>
                  <strong>↩️ Rollback Complete</strong> — {result.rolledBack} user(s) reverted to student status.
                </>
              ) : (
                <>
                  <strong>🎉 Conversion Successful!</strong> — {result.converted} student(s) are now alumni (pending approval).
                  {result.skipped > 0 && ` ${result.skipped} skipped (already converted).`}
                  <br />
                  <span style={{ fontSize: 13, color: "#555", marginTop: 4, display: "block" }}>
                    These users will see the Alumni Dashboard on next login. They must upload graduation documents before they are fully approved.
                  </span>
                </>
              )}
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div style={styles.errorBanner}>
              ❌ {error}
            </div>
          )}
        </>
      )}

      {/* ── HISTORY SECTION ─────────────────────────────────────────────── */}
      {activeSection === "history" && (
        <div style={styles.previewCard}>
          <div style={styles.filterRow}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Filter by Year</label>
              <select style={styles.select} value={histYear} onChange={(e) => setHistYear(e.target.value)}>
                <option value="">All Years</option>
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button style={styles.btnPreview} onClick={loadHistory} disabled={historyLoading}>
              {historyLoading ? "Loading..." : "🔄 Refresh"}
            </button>
          </div>

          {historyLoading ? (
            <div style={styles.emptyState}>⏳ Loading...</div>
          ) : !history ? (
            <div style={styles.emptyState}>Select filters and click Refresh.</div>
          ) : history.conversions.length === 0 ? (
            <div style={styles.emptyState}>No conversion records found.</div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px" }}>
                Showing {history.conversions.length} of {history.total} total records
              </p>
              <div style={styles.studentTableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thead}>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Full Name</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Branch</th>
                      <th style={styles.th}>Class of</th>
                      <th style={styles.th}>Converted At</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.conversions.map((c, i) => (
                      <tr key={c.userId} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                        <td style={styles.td}>{i + 1}</td>
                        <td style={styles.td}>{c.fullName}</td>
                        <td style={{ ...styles.td, fontSize: 12, color: "#555" }}>{c.email}</td>
                        <td style={styles.td}>{c.branch}</td>
                        <td style={styles.td}>{c.graduationYear}</td>
                        <td style={{ ...styles.td, fontSize: 12 }}>
                          {c.convertedAt ? new Date(c.convertedAt).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td style={styles.td}>
                          {c.currentRole === "alumni" ? (
                            <span style={c.isApproved ? styles.badgeApproved : styles.badgePending}>
                              {c.isApproved ? "✅ Approved" : "⏳ Pending"}
                            </span>
                          ) : (
                            <span style={styles.badgeRolledBack}>↩️ Rolled Back</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Inline styles (matches AdminPanel.css palette) ─────────────────────────
const styles = {
  container: { padding: "0 0 40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: "#0f3460", margin: "0 0 6px" },
  subtitle: { fontSize: 13, color: "#666", margin: 0, maxWidth: 600 },
  sectionToggle: { display: "flex", gap: 8 },
  toggleBtn: { padding: "8px 18px", borderRadius: 8, border: "1px solid #ddd", background: "#f8f9ff", color: "#555", cursor: "pointer", fontSize: 13, fontWeight: 600 },
  toggleActive: { background: "#0f3460", color: "#fff", border: "1px solid #0f3460" },

  filterCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 20 },
  filterTitle: { fontSize: 16, fontWeight: 700, color: "#0f3460", margin: "0 0 16px" },
  filterRow: { display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" },
  filterGroup: { display: "flex", flexDirection: "column", gap: 6, minWidth: 160 },
  label: { fontSize: 12, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 },
  select: { padding: "9px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, background: "#fff", color: "#222" },

  btnPreview: { padding: "10px 20px", background: "#0f3460", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" },
  btnConvert: { padding: "12px 28px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 15 },
  btnRollback: { padding: "12px 20px", background: "#fff", color: "#dc2626", border: "1px solid #dc2626", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },

  previewCard: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, marginBottom: 20 },
  previewStats: { display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" },
  statBox: { flex: 1, minWidth: 120, borderRadius: 10, padding: "16px 20px", textAlign: "center" },
  statNum: { fontSize: 32, fontWeight: 800, color: "#0f3460" },
  statLbl: { fontSize: 12, color: "#555", fontWeight: 600, marginTop: 4 },

  infoBox: { background: "#f8faff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "14px 18px", marginBottom: 16 },
  infoList: { margin: "8px 0 0", paddingLeft: 20, lineHeight: 2, fontSize: 13, color: "#444" },

  studentTableWrap: { overflowX: "auto", borderRadius: 8, border: "1px solid #e5e7eb" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  thead: { background: "#f0f4ff" },
  th: { padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#0f3460", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" },
  td: { padding: "10px 14px", color: "#333", borderBottom: "1px solid #f0f0f0" },
  trEven: { background: "#fff" },
  trOdd: { background: "#fafafa" },

  actionRow: { display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" },
  emptyState: { textAlign: "center", padding: "30px 20px", color: "#777", fontSize: 14 },

  resultBanner: { border: "1px solid", borderRadius: 10, padding: "16px 20px", marginBottom: 16, fontSize: 14, lineHeight: 1.6 },
  errorBanner: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "14px 18px", color: "#dc2626", fontSize: 14, marginBottom: 16 },

  badgeApproved: { display: "inline-block", background: "#dcfce7", color: "#16a34a", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  badgePending: { display: "inline-block", background: "#fef9c3", color: "#b45309", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  badgeRolledBack: { display: "inline-block", background: "#fff7ed", color: "#ea580c", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
};
