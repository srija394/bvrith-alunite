import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Unauthorized() {
  const { user } = useAuth();

  const dashboardLink = user?.role === "admin"
    ? "/dashboard/admin"
    : user?.role === "alumni"
    ? "/dashboard/alumni"
    : "/dashboard/student";

  return (
    <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <div style={{ fontSize: "4rem" }}>🚫</div>
      <h1 style={{ color: "#e94560" }}>Access Denied</h1>
      <p style={{ color: "#666" }}>You don't have permission to view this page.</p>
      <Link
        to={dashboardLink}
        style={{
          display: "inline-block",
          marginTop: "1rem",
          padding: "0.6rem 1.5rem",
          background: "#0f3460",
          color: "#fff",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: "600",
        }}
      >
        Go to My Dashboard
      </Link>
    </div>
  );
}
