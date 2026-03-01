import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import "./AdminPanel.css";
import "./Analytics.css";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

function StatCard({ title, value, sub, color }) {
  return (
    <div className="analytics-stat-card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="analytics-stat-value" style={{ color }}>{value}</div>
      <div className="analytics-stat-title">{title}</div>
      {sub && <div className="analytics-stat-sub">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <div className="analytics-chart-card">
      <div className="analytics-chart-header">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [analyticsRes, statsRes] = await Promise.all([
          API.get("/admin/analytics"),
          API.get("/admin/stats"),
        ]);
        setData(analyticsRes.data);
        setStats(statsRes.data);
      } catch (err) {
        setError("Failed to load analytics data.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <>
      <Navbar />
      <div className="analytics-loading">
        <div className="analytics-spinner" />
        <p>Loading analytics…</p>
      </div>
    </>
  );

  if (error) return (
    <>
      <Navbar />
      <div className="analytics-error">
        <h3>⚠️ {error}</h3>
        <button onClick={() => navigate("/dashboard/admin")}>← Back to Dashboard</button>
      </div>
    </>
  );

  const avgAcceptance = data.mentorshipChart.length > 0
    ? Math.round(data.mentorshipChart.reduce((sum, m) => sum + m.acceptanceRate, 0) / data.mentorshipChart.length)
    : 0;

  return (
    <>
      <Navbar />
      <div className="analytics-container">
        {/* Header */}
        <div className="analytics-header">
          <div>
            <button className="analytics-back-btn" onClick={() => navigate("/dashboard/admin")}>
              ← Dashboard
            </button>
            <h1>📊 Placement Cell Analytics</h1>
            <p>Institution-wide insights and trends</p>
          </div>
          <div className="analytics-header-meta">
            Last updated: {new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </div>
        </div>

        {/* Quick Stats Row */}
        {stats && (
          <div className="analytics-stats-row">
            <StatCard title="Total Users" value={stats.totalUsers} sub={`${stats.totalStudents} students · ${stats.totalAlumni} alumni`} color="#6366f1" />
            <StatCard title="Mentorships" value={stats.totalMentorships} sub={`${stats.acceptedMentorships} active`} color="#22c55e" />
            <StatCard title="Avg Acceptance Rate" value={`${avgAcceptance}%`} sub="over last 6 months" color="#f59e0b" />
            <StatCard title="Total Events" value={stats.totalEvents} color="#06b6d4" />
          </div>
        )}

        {/* Charts Grid */}
        <div className="analytics-charts-grid">

          {/* Mentorship Acceptance Rate Over Time */}
          <ChartCard
            title="🤝 Mentorship Acceptance Rate"
            description="Monthly acceptance rate over the past 6 months"
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.mentorshipChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
                <Line type="monotone" dataKey="acceptanceRate" name="Acceptance Rate" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="total" name="Total Requests" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top Skills in Demand */}
          <ChartCard
            title="🧠 Top Skills in Demand"
            description="Most listed skills across all student profiles"
          >
            {data.topSkills.length === 0 ? (
              <div className="analytics-empty">No skill data yet. Students need to add skills to their profiles.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.topSkills} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="skill" type="category" tick={{ fontSize: 12 }} width={60} />
                  <Tooltip />
                  <Bar dataKey="count" name="Students" radius={[0, 4, 4, 0]}>
                    {data.topSkills.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Active Alumni by Graduation Year */}
          <ChartCard
            title="🎓 Alumni by Graduation Year"
            description="Distribution of registered alumni across batches"
          >
            {data.alumniChart.length === 0 ? (
              <div className="analytics-empty">No alumni graduation year data available yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.alumniChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Alumni" fill="#22c55e" radius={[4, 4, 0, 0]}>
                    {data.alumniChart.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Alumni by Branch */}
          <ChartCard
            title="🏫 Alumni by Branch"
            description="Registered alumni distribution by department"
          >
            {data.branchChart.length === 0 ? (
              <div className="analytics-empty">No branch data available yet. Alumni need to complete their profiles.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.branchChart}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ branch, percent }) => `${branch} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    dataKey="count"
                    nameKey="branch"
                  >
                    {data.branchChart.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Event Attendance Trends */}
          <ChartCard
            title="🗓️ Event Attendance Trends"
            description="Registrations per event over the past 6 months"
          >
            {data.eventChart.length === 0 ? (
              <div className="analytics-empty">No events found in the last 6 months.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.eventChart} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="title"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="attendees" name="Registrations" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Mentorship Funnel */}
          <ChartCard
            title="📈 Mentorship Funnel (6 months)"
            description="Total vs accepted requests month by month"
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.mentorshipChart} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total Requests" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="accepted" name="Accepted" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      </div>
    </>
  );
}
