import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps a route and checks:
 *  1. User is logged in
 *  2. User's role is in allowedRoles (if provided)
 *  3. If requireApproval=true and user is alumni, they must be approved
 */
export default function ProtectedRoute({ children, allowedRoles, requireApproval = false }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Block unapproved alumni from approval-required routes
  if (requireApproval && user.role === "alumni" && !user.isApproved) {
    return <Navigate to="/dashboard/alumni" replace />;
  }

  return children;
}
