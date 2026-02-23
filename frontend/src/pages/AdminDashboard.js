import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import "./AdminPanel.css";

const TABS = [
  { id: "overview",       label: "📊 Overview" },
  { id: "users",          label: "👥 Users" },
  { id: "mentorship",     label: "🤝 Mentorship" },
  { id: "announcements",  label: "📣 Announcements" },
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
    API.get("/admin/stats").then((r) => setStats(r.data)).catch(()=>{}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const CARDS = [
    { icon:"👥", label:"Total Users",       value: stats.totalUsers,        sub:"students + alumni" },
    { icon:"🎓", label:"Students",          value: stats.totalStudents },
    { icon:"🏅", label:"Alumni",            value: stats.totalAlumni },
    { icon:"⏳", label:"Pending Approvals", value: stats.pendingAlumni,     alert: stats.pendingAlumni > 0 },
    { icon:"🤝", label:"Total Mentorships", value: stats.totalMentorships },
    { icon:"✅", label:"Accepted",          value: stats.acceptedMentorships },
    { icon:"🗓️", label:"Events Created",    value: stats.totalEvents },
    { icon:"💬", label:"Messages Sent",     value: stats.totalMessages },
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(null);

  const fetchUsers = async (pg = page) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: pg, limit: 15 });
      if (roleFilter) p.set("role", roleFilter);
      if (search) p.set("search", search);
      const { data } = await API.get(`/admin/users?${p}`);
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch(e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [roleFilter, page]);

  const act = async (action, userId, extra = {}) => {
    setBusy(userId + action);
    try {
      if (action === "approve") await API.patch(`/admin/users/${userId}/approve`);
      else if (action === "toggle") await API.patch(`/admin/users/${userId}/toggle-active`);
      else if (action === "delete") {
        if (!window.confirm("Delete this user permanently?")) { setBusy(null); return; }
        await API.delete(`/admin/users/${userId}`);
        setUsers((u) => u.filter((x) => x._id !== userId));
        setBusy(null); return;
      } else if (action === "role") await API.patch(`/admin/users/${userId}/role`, { role: extra.role });
      fetchUsers();
    } catch(e) { alert(e.response?.data?.message || "Action failed"); }
    finally { setBusy(null); }
  };

  return (
    <div>
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
                    <td>{u.profile?.fullName || <span className="no-profile">No profile</span>}</td>
                    <td>
                      {u.role === "alumni" && !u.isApproved
                        ? <span className="status-pill pending">Pending</span>
                        : u.isActive ? <span className="status-pill active">Active</span> : <span className="status-pill inactive">Inactive</span>}
                    </td>
                    <td className="date-cell">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "—"}</td>
                    <td>
                      <div className="action-btns">
                        {u.role === "alumni" && !u.isApproved && (
                          <button className="btn-action approve" disabled={busy === u._id+"approve"} onClick={() => act("approve", u._id)}>✓ Approve</button>
                        )}
                        <button className={`btn-action ${u.isActive ? "deactivate" : "activate"}`} disabled={busy === u._id+"toggle"} onClick={() => act("toggle", u._id)}>
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                        {u.role === "student" && (
                          <button className="btn-action role-change" disabled={busy === u._id+"role"} onClick={() => act("role", u._id, { role:"alumni" })}>→ Alumni</button>
                        )}
                        {u.role === "alumni" && (
                          <button className="btn-action role-change" disabled={busy === u._id+"role"} onClick={() => act("role", u._id, { role:"student" })}>→ Student</button>
                        )}
                        <button className="btn-action delete" disabled={busy === u._id+"delete"} onClick={() => act("delete", u._id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="admin-pagination">
              <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-page">← Prev</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="btn-page">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════ TAB 3 — Mentorship ══════════ */
function MentorshipTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/admin/mentorship-stats").then((r) => setData(r.data)).catch(()=>{}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const STATUS_COLOR = { pending:"#f59e0b", accepted:"#22c55e", rejected:"#ef4444" };

  return (
    <div>
      <h2 className="tab-title">Mentorship Overview</h2>
      <div className="mentorship-stats-row">
        {[
          { label:"Total Requests", value: data.total,    icon:"🤝" },
          { label:"Pending",        value: data.pending,  icon:"⏳", color:"#f59e0b" },
          { label:"Accepted",       value: data.accepted, icon:"✅", color:"#22c55e" },
          { label:"Rejected",       value: data.rejected, icon:"❌", color:"#ef4444" },
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
          <thead><tr><th>Student</th><th>Alumni</th><th>Match Score</th><th>Status</th><th>Date</th></tr></thead>
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
                  <div className="match-score-bar">
                    <div className="match-score-fill" style={{ width:`${Math.round(r.matchScore*100)}%` }} />
                    <span>{Math.round(r.matchScore*100)}%</span>
                  </div>
                </td>
                <td>
                  <span className="status-pill" style={{ background: STATUS_COLOR[r.status]+"22", color: STATUS_COLOR[r.status] }}>
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

/* ══════════ TAB 4 — Announcements ══════════ */
function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:"", content:"", targetRole:"all", pinned:false });
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try { const { data } = await API.get("/admin/announcements"); setAnnouncements(data.announcements); }
    catch(e) {}
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    setPosting(true); setError("");
    try {
      await API.post("/admin/announcements", form);
      setForm({ title:"", content:"", targetRole:"all", pinned:false });
      setShowForm(false);
      load();
    } catch(err) { setError(err.response?.data?.message || "Failed to post"); }
    finally { setPosting(false); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try { await API.delete(`/admin/announcements/${id}`); setAnnouncements((a) => a.filter((x) => x._id !== id)); }
    catch(e) {}
  };

  const TARGET_LABEL = { all:"Everyone", student:"Students only", alumni:"Alumni only" };
  const TARGET_COLOR = { all:"#0f3460", student:"#0891b2", alumni:"#16a34a" };

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
                <input value={form.title} onChange={(e) => setForm((f)=>({...f,title:e.target.value}))} required placeholder="e.g. Campus Recruitment Drive 2025" />
              </div>
              <div className="form-group-a" style={{ maxWidth:180 }}>
                <label>Target Audience</label>
                <select value={form.targetRole} onChange={(e) => setForm((f)=>({...f,targetRole:e.target.value}))}>
                  <option value="all">Everyone</option>
                  <option value="student">Students only</option>
                  <option value="alumni">Alumni only</option>
                </select>
              </div>
            </div>
            <div className="form-group-a">
              <label>Content *</label>
              <textarea value={form.content} onChange={(e) => setForm((f)=>({...f,content:e.target.value}))} required rows={4} maxLength={2000} placeholder="Write your announcement here..." />
            </div>
            <div className="form-footer-a">
              <label className="pin-label">
                <input type="checkbox" checked={form.pinned} onChange={(e) => setForm((f)=>({...f,pinned:e.target.checked}))} />
                📌 Pin this announcement
              </label>
              <button type="submit" className="btn-admin-primary" disabled={posting}>{posting ? "Posting..." : "Post Announcement"}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <Loader /> : announcements.length === 0 ? (
        <div className="empty-state">📣 No announcements yet. Post one above!</div>
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
                  <span className="target-badge" style={{ color:TARGET_COLOR[a.targetRole], background:TARGET_COLOR[a.targetRole]+"18" }}>
                    {TARGET_LABEL[a.targetRole]}
                  </span>
                  <span className="ann-date">{new Date(a.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span>
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
