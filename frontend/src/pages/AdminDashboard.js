import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import "./AdminPanel.css";

// Helper — trigger a CSV file download from an API route
function downloadCSV(endpoint, filename) {
  const token = localStorage.getItem("token");
  fetch(`http://localhost:5000/api${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((r) => r.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(() => alert("Export failed"));
}

const TABS = [
  { id: "overview",      label: "📊 Overview" },
  { id: "users",         label: "👥 Users" },
  { id: "mentorship",    label: "🤝 Mentorship" },
  { id: "events",        label: "🗓️ Events" },
  { id: "announcements", label: "📣 Announcements" },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();
  return (
    <>
      <Navbar />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>🔐 Admin Control Panel</h1>
            <p>Full institution-level management</p>
          </div>
          <div className="admin-header-actions">
            <button className="btn-admin-secondary" onClick={() => navigate("/dashboard/admin/analytics")}>📊 Analytics</button>
            <button className="btn-admin-secondary" onClick={() => navigate("/forum")}>💬 Forum</button>
            <button className="btn-admin-secondary" onClick={() => navigate("/events")}>🗓️ Events</button>
            <button className="btn-admin-secondary" onClick={() => navigate("/alumni/directory")}>🎓 Directory</button>
          </div>
        </div>
        <div className="admin-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`admin-tab ${activeTab === t.id ? "active" : ""}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="admin-content">
          {activeTab === "overview"      && <OverviewTab />}
          {activeTab === "users"         && <UsersTab />}
          {activeTab === "mentorship"    && <MentorshipTab />}
          {activeTab === "events"        && <EventsTab />}
          {activeTab === "announcements" && <AnnouncementsTab />}
        </div>
      </div>
    </>
  );
}

/* ══════════ TAB 1 — Overview ══════════ */
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    API.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <Loader />;
  const CARDS = [
    { icon: "👥", label: "Total Users",       value: stats.totalUsers,         sub: "students + alumni" },
    { icon: "🎓", label: "Students",          value: stats.totalStudents },
    { icon: "🏅", label: "Alumni",            value: stats.totalAlumni },
    { icon: "⏳", label: "Pending Approvals", value: stats.pendingAlumni,      alert: stats.pendingAlumni > 0 },
    { icon: "🤝", label: "Total Mentorships", value: stats.totalMentorships },
    { icon: "✅", label: "Accepted",          value: stats.acceptedMentorships },
    { icon: "🗓️", label: "Events Created",   value: stats.totalEvents },
    { icon: "💬", label: "Messages Sent",     value: stats.totalMessages },
  ];
  return (
    <div>
      <h2 className="tab-title">Platform Overview</h2>
      <div className="stat-cards-grid">
        {CARDS.map((s) => (
          <div key={s.label} className={`admin-stat-card ${s.alert ? "alert-card" : ""}`}>
            <span className="admin-stat-icon">{s.icon}</span>
            <div>
              <div className="admin-stat-value">{s.value ?? "—"}</div>
              <div className="admin-stat-label">{s.label}</div>
              {s.sub && <div className="admin-stat-sub">{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>
      {stats.pendingAlumni > 0 && (
        <div className="admin-alert-banner">
          ⚠️ <strong>{stats.pendingAlumni} alumni</strong> waiting for approval — go to the <strong>Users</strong> tab.
        </div>
      )}
    </div>
  );
}

/* ══════════ TAB 2 — Users ══════════ */
function UsersTab() {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [busy, setBusy]             = useState(null);
  const [reviewId, setReviewId]     = useState(null);

  const fetchUsers = async (pg = page) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: pg, limit: 15 });
      if (roleFilter) p.set("role", roleFilter);
      if (search)     p.set("search", search);
      const { data } = await API.get(`/admin/users?${p}`);
      setUsers(data.users); setTotalPages(data.totalPages); setTotal(data.total);
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [roleFilter, page]);

  const act = async (action, userId, extra = {}) => {
    setBusy(userId + action);
    try {
      if (action === "approve") {
        await API.patch(`/admin/users/${userId}/approve`);
        setReviewId(null);
      } else if (action === "reject") {
        if (!window.confirm("Reject and permanently delete this alumni account?")) { setBusy(null); return; }
        await API.delete(`/admin/users/${userId}/reject`);
        setUsers((u) => u.filter((x) => x._id !== userId));
        setReviewId(null); setBusy(null); return;
      } else if (action === "toggle") {
        await API.patch(`/admin/users/${userId}/toggle-active`);
      } else if (action === "delete") {
        if (!window.confirm("Delete this user permanently?")) { setBusy(null); return; }
        await API.delete(`/admin/users/${userId}`);
        setUsers((u) => u.filter((x) => x._id !== userId));
        setBusy(null); return;
      } else if (action === "role") {
        await API.patch(`/admin/users/${userId}/role`, { role: extra.role });
      }
      fetchUsers();
    } catch (e) { alert(e.response?.data?.message || "Action failed"); }
    finally { setBusy(null); }
  };

  return (
    <div>
      {reviewId && (
        <AlumniReviewModal
          userId={reviewId}
          onClose={() => setReviewId(null)}
          onApprove={(id) => act("approve", id)}
          onReject={(id) => act("reject", id)}
          busy={busy}
        />
      )}
      <div className="tab-toolbar">
        <h2 className="tab-title">User Management <span className="count-badge">{total}</span></h2>
        <div className="toolbar-right">
          <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchUsers(1); }} className="search-form">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email..." className="admin-search-input" />
            <button type="submit" className="btn-admin-sm">Search</button>
          </form>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="admin-select">
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="alumni">Alumni</option>
          </select>
          <button className="btn-export" onClick={() => downloadCSV("/admin/export/users", "users.csv")}>
            ⬇️ Export CSV
          </button>
        </div>
      </div>
      {loading ? <Loader /> : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Email</th><th>Role</th><th>Name</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className={!u.isActive ? "inactive-row" : ""}>
                    <td className="email-cell">{u.email}</td>
                    <td><span className={`role-pill ${u.role}`}>{u.role}</span></td>
                    <td>
                      {u.role === "alumni" && !u.isApproved ? (
                        <button className="btn-view-profile" onClick={() => setReviewId(u._id)}>
                          👁️ {u.profile?.fullName || "View Profile"}
                        </button>
                      ) : (
                        u.profile?.fullName || <span className="no-profile">No profile</span>
                      )}
                    </td>
                    <td>
                      {u.role === "alumni" && !u.isApproved
                        ? <span className="status-pill pending">⏳ Pending Review</span>
                        : u.isActive
                          ? <span className="status-pill active">Active</span>
                          : <span className="status-pill inactive">Inactive</span>}
                    </td>
                    <td className="date-cell">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                    <td>
                      <div className="action-btns">
                        {u.role === "alumni" && !u.isApproved && (
                          <>
                            <button className="btn-action approve" disabled={busy === u._id + "approve"} onClick={() => act("approve", u._id)}>✓ Approve</button>
                            <button className="btn-action deactivate" disabled={busy === u._id + "reject"} onClick={() => act("reject", u._id)}>✗ Reject</button>
                          </>
                        )}
                        <button className={`btn-action ${u.isActive ? "deactivate" : "activate"}`} disabled={busy === u._id + "toggle"} onClick={() => act("toggle", u._id)}>
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                        {u.role === "student" && (
                          <button className="btn-action role-change" disabled={busy === u._id + "role"} onClick={() => act("role", u._id, { role: "alumni" })}>→ Alumni</button>
                        )}
                        {u.role === "alumni" && (
                          <button className="btn-action role-change" disabled={busy === u._id + "role"} onClick={() => act("role", u._id, { role: "student" })}>→ Student</button>
                        )}
                        <button className="btn-action delete" disabled={busy === u._id + "delete"} onClick={() => act("delete", u._id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="admin-pagination">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-page">← Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-page">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Alumni Profile Review Modal ── */
function AlumniReviewModal({ userId, onClose, onApprove, onReject, busy }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/admin/users/${userId}/alumni-profile`)
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👤 Alumni Profile Review</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? <Loader /> : !data ? (
          <div className="modal-empty">Profile not found or incomplete. You can still approve/reject.</div>
        ) : (
          <div className="modal-body">

            {/* Info grid */}
            <div className="review-section">
              <h3>📋 Basic Information</h3>
              <div className="review-grid">
                {[
                  ["Full Name",    data.profile.fullName],
                  ["Email",        data.user.email],
                  ["Roll Number",  data.profile.rollNumber || "⚠️ Not provided"],
                  ["Branch",       data.profile.branch],
                  ["Graduation Year", data.profile.graduationYear],
                  ["Phone",        data.profile.phone || "—"],
                  ["Current Company", data.profile.currentCompany || "—"],
                  ["Current Role", data.profile.currentRole || "—"],
                  ["Location",     data.profile.location || "—"],
                  ["Open to Mentorship", data.profile.isAvailableForMentorship ? "✅ Yes" : "No"],
                ].map(([label, val]) => (
                  <div key={label} className="review-field">
                    <span className="rf-label">{label}</span>
                    <span className={`rf-value ${val === "⚠️ Not provided" ? "rf-missing" : ""}`}>{val || "—"}</span>
                  </div>
                ))}
              </div>
              {data.profile.skills?.length > 0 && (
                <div className="review-skills">
                  {data.profile.skills.map((s) => <span key={s} className="skill-tag">{s}</span>)}
                </div>
              )}
              {data.profile.bio && <p className="review-bio">"{data.profile.bio}"</p>}
            </div>

            {/* Documents */}
            <div className="review-section">
              <h3>📁 Uploaded Documents</h3>
              <div className="docs-grid">

                <div className={`doc-card ${!data.profile.graduationDocUrl ? "doc-missing" : ""}`}>
                  <div className="doc-icon">🎓</div>
                  <div className="doc-info">
                    <div className="doc-label">Graduation Cert / Marksheet</div>
                    {data.profile.graduationDocUrl ? (
                      <>
                        <div className="doc-name">{data.profile.graduationDocName}</div>
                        <a href={data.profile.graduationDocUrl} target="_blank" rel="noreferrer" className="btn-view-doc">📄 Open Document</a>
                      </>
                    ) : <div className="doc-not-uploaded">⚠️ Not uploaded yet</div>}
                  </div>
                </div>

                <div className={`doc-card ${!data.profile.resumeUrl ? "doc-missing" : ""}`}>
                  <div className="doc-icon">📄</div>
                  <div className="doc-info">
                    <div className="doc-label">Resume / CV</div>
                    {data.profile.resumeUrl ? (
                      <>
                        <div className="doc-name">{data.profile.resumeName}</div>
                        <a href={data.profile.resumeUrl} target="_blank" rel="noreferrer" className="btn-view-doc">📄 Open Resume</a>
                      </>
                    ) : <div className="doc-not-uploaded">Not uploaded</div>}
                  </div>
                </div>

                <div className="doc-card">
                  <div className="doc-icon">🖼️</div>
                  <div className="doc-info">
                    <div className="doc-label">Profile Photo</div>
                    {data.profile.photoUrl
                      ? <img src={data.profile.photoUrl} alt="Profile" className="review-photo" />
                      : <div className="doc-not-uploaded">Not uploaded</div>}
                  </div>
                </div>

              </div>
              {data.profile.certificates?.length > 0 && (
                <div className="other-certs">
                  <h4>Other Certificates ({data.profile.certificates.length})</h4>
                  <div className="cert-list">
                    {data.profile.certificates.map((c, i) => (
                      <a key={i} href={c.url} target="_blank" rel="noreferrer" className="cert-link">📎 {c.name}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="modal-actions">
              <button className="btn-modal-reject" disabled={!!busy} onClick={() => onReject(userId)}>
                ✗ Reject Profile
              </button>
              <button className="btn-modal-approve" disabled={!!busy} onClick={() => onApprove(userId)}>
                ✓ Approve &amp; Activate
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════ TAB 3 — Mentorship ══════════ */
function MentorshipTab() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/admin/mentorship-stats").then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data)   return <div className="empty-state">Failed to load data.</div>;

  const STATUS_COLOR = { pending: "#f59e0b", accepted: "#22c55e", rejected: "#ef4444" };

  return (
    <div>
      <div className="tab-toolbar">
        <h2 className="tab-title">Mentorship Overview</h2>
        <button className="btn-export" onClick={() => downloadCSV("/admin/export/mentorship", "mentorship.csv")}>
          ⬇️ Export CSV
        </button>
      </div>
      <div className="mentorship-stats-row">
        {[
          { label: "Total Requests", value: data.total,    icon: "🤝" },
          { label: "Pending",        value: data.pending,  icon: "⏳", color: "#f59e0b" },
          { label: "Accepted",       value: data.accepted, icon: "✅", color: "#22c55e" },
          { label: "Rejected",       value: data.rejected, icon: "❌", color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} className="mentorship-stat-card" style={{ borderColor: s.color || "#e0e0e0" }}>
            <span>{s.icon}</span>
            <div className="m-stat-value" style={{ color: s.color || "#1a1a2e" }}>{s.value}</div>
            <div className="m-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <h3 className="sub-title">Recent Requests</h3>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Student</th><th>Alumni</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {data.recent.map((r) => (
              <tr key={r._id}>
                <td>
                  <div className="cell-name">{r.studentName || r.studentEmail}</div>
                  <div className="cell-email">{r.studentName ? r.studentEmail : ""}</div>
                </td>
                <td>
                  <div className="cell-name">{r.alumniName || r.alumniEmail}</div>
                  <div className="cell-email">{r.alumniName ? r.alumniEmail : ""}</div>
                </td>
                <td>
                  <span className="status-pill" style={{ background: STATUS_COLOR[r.status] + "22", color: STATUS_COLOR[r.status] }}>
                    {r.status}
                  </span>
                </td>
                <td className="date-cell">{new Date(r.createdAt).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════ TAB 4 — Events ══════════ */
function EventsTab() {
  const [events, setEvents]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedId, setSelectedId]   = useState(null);
  const [registrants, setRegistrants] = useState(null);
  const [regLoading, setRegLoading]   = useState(false);

  useEffect(() => {
    API.get("/admin/events").then((r) => setEvents(r.data.events)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const viewRegs = async (eventId) => {
    setSelectedId(eventId);
    setRegLoading(true);
    setRegistrants(null);
    try {
      const { data } = await API.get(`/admin/events/${eventId}/registrations`);
      setRegistrants(data);
    } catch (e) {}
    finally { setRegLoading(false); }
  };

  return (
    <div>
      <div className="tab-toolbar">
        <h2 className="tab-title">Events &amp; Registrations</h2>
        <button className="btn-export" onClick={() => downloadCSV("/admin/export/events", "events.csv")}>
          ⬇️ Export CSV
        </button>
      </div>
      {loading ? <Loader /> : events.length === 0 ? (
        <div className="empty-state">🗓️ No events yet.</div>
      ) : (
        <div className="events-admin-list">
          {events.map((ev) => (
            <div key={ev._id} className={`event-admin-card ${selectedId === ev._id ? "active-ev" : ""}`}>
              <div className="event-admin-info">
                <div className="event-admin-title">{ev.title}</div>
                <div className="event-admin-meta">
                  📅 {new Date(ev.date).toLocaleDateString("en-IN")} · {ev.time} · {ev.venue}
                  <span className="ev-cat-badge">{ev.category}</span>
                </div>
                <div className="event-admin-sub">
                  Created by: <strong>{ev.createdBy?.email}</strong> · <strong>{ev.registrations?.length || 0}</strong> registered
                </div>
              </div>
              <button className="btn-view-reg" onClick={() => viewRegs(ev._id)}>
                👥 Registrations
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedId && (
        <div className="registrations-panel">
          <div className="reg-panel-header">
            <h3>Registered Members {registrants ? `(${registrants.total})` : ""}</h3>
            <button className="btn-close-reg" onClick={() => { setSelectedId(null); setRegistrants(null); }}>✕ Close</button>
          </div>
          {regLoading ? <Loader /> : !registrants ? (
            <div className="empty-state">Could not load registrations.</div>
          ) : registrants.registrants.length === 0 ? (
            <div className="empty-state">No registrations for this event yet.</div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Details</th><th>Registered At</th></tr>
                </thead>
                <tbody>
                  {registrants.registrants.map((r, i) => (
                    <tr key={r.userId}>
                      <td>{i + 1}</td>
                      <td><div className="cell-name">{r.name}</div></td>
                      <td className="email-cell">{r.email}</td>
                      <td><span className={`role-pill ${r.role}`}>{r.role}</span></td>
                      <td className="cell-email">
                        {r.role === "student"
                          ? `${r.details?.branch || "—"} · Year ${r.details?.year || "—"}`
                          : `${r.details?.branch || "—"} · ${r.details?.graduationYear || "—"}`}
                      </td>
                      <td className="date-cell">{new Date(r.registeredAt).toLocaleDateString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════ TAB 5 — Announcements ══════════ */
function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [form, setForm]                   = useState({ title: "", content: "", targetRole: "all", pinned: false });
  const [posting, setPosting]             = useState(false);
  const [error, setError]                 = useState("");

  const load = async () => {
    try { const { data } = await API.get("/admin/announcements"); setAnnouncements(data.announcements); }
    catch (e) {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handlePost = async (e) => {
    e.preventDefault(); setPosting(true); setError("");
    try {
      await API.post("/admin/announcements", form);
      setForm({ title: "", content: "", targetRole: "all", pinned: false });
      setShowForm(false); load();
    } catch (err) { setError(err.response?.data?.message || "Failed to post"); }
    finally { setPosting(false); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try { await API.delete(`/admin/announcements/${id}`); setAnnouncements((a) => a.filter((x) => x._id !== id)); }
    catch (e) {}
  };

  const TARGET_LABEL = { all: "Everyone", student: "Students only", alumni: "Alumni only" };
  const TARGET_COLOR = { all: "#0f3460", student: "#0891b2", alumni: "#16a34a" };

  return (
    <div>
      <div className="tab-toolbar">
        <h2 className="tab-title">Announcements</h2>
        <button className="btn-admin-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New Announcement"}
        </button>
      </div>
      {showForm && (
        <div className="announcement-form-card">
          {error && <div className="form-error">{error}</div>}
          <form onSubmit={handlePost}>
            <div className="form-row-a">
              <div className="form-group-a">
                <label>Title *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="e.g. Campus Recruitment Drive" />
              </div>
              <div className="form-group-a" style={{ maxWidth: 180 }}>
                <label>Target</label>
                <select value={form.targetRole} onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))}>
                  <option value="all">Everyone</option>
                  <option value="student">Students only</option>
                  <option value="alumni">Alumni only</option>
                </select>
              </div>
            </div>
            <div className="form-group-a">
              <label>Content *</label>
              <textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} required rows={4} maxLength={2000} />
            </div>
            <div className="form-footer-a">
              <label className="pin-label">
                <input type="checkbox" checked={form.pinned} onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))} />
                📌 Pin this announcement
              </label>
              <button type="submit" className="btn-admin-primary" disabled={posting}>{posting ? "Posting..." : "Post"}</button>
            </div>
          </form>
        </div>
      )}
      {loading ? <Loader /> : announcements.length === 0 ? (
        <div className="empty-state">📣 No announcements yet.</div>
      ) : (
        <div className="announcements-list">
          {announcements.map((a) => (
            <div key={a._id} className={`announcement-card ${a.pinned ? "pinned" : ""}`}>
              <div className="ann-top">
                <div className="ann-title-row">
                  {a.pinned && <span className="pin-badge">📌 Pinned</span>}
                  <h3>{a.title}</h3>
                </div>
                <div className="ann-meta">
                  <span className="target-badge" style={{ color: TARGET_COLOR[a.targetRole], background: TARGET_COLOR[a.targetRole] + "18" }}>{TARGET_LABEL[a.targetRole]}</span>
                  <span className="ann-date">{new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <button className="btn-delete-ann" onClick={() => del(a._id)}>🗑️</button>
                </div>
              </div>
              <p className="ann-content">{a.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Loader() {
  return <div className="admin-loader"><div className="admin-spinner" /><p>Loading...</p></div>;
}