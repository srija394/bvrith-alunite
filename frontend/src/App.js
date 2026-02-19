import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import AlumniDashboard from "./pages/AlumniDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Unauthorized from "./pages/Unauthorized";
import CreateProfile from "./pages/CreateProfile";
import EditProfile from "./pages/EditProfile";
import ViewProfile from "./pages/ViewProfile";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/dashboard/admin" replace />;
  if (user.role === "alumni") return <Navigate to="/dashboard/alumni" replace />;
  return <Navigate to="/dashboard/student" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected - Student */}
          <Route path="/dashboard/student" element={
            <ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>
          } />

          {/* Protected - Alumni */}
          <Route path="/dashboard/alumni" element={
            <ProtectedRoute allowedRoles={["alumni"]}><AlumniDashboard /></ProtectedRoute>
          } />

          {/* Protected - Admin */}
          <Route path="/dashboard/admin" element={
            <ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>
          } />

          {/* Profile routes (student + alumni) */}
          <Route path="/profile/create" element={
            <ProtectedRoute allowedRoles={["student", "alumni"]}><CreateProfile /></ProtectedRoute>
          } />
          <Route path="/profile/edit" element={
            <ProtectedRoute allowedRoles={["student", "alumni"]}><EditProfile /></ProtectedRoute>
          } />
          <Route path="/profile/view" element={
            <ProtectedRoute allowedRoles={["student", "alumni"]}><ViewProfile /></ProtectedRoute>
          } />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
