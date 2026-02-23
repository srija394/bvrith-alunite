import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOTP from "./pages/VerifyOTP";
import StudentDashboard from "./pages/StudentDashboard";
import AlumniDashboard from "./pages/AlumniDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Unauthorized from "./pages/Unauthorized";
import CreateProfile from "./pages/CreateProfile";
import EditProfile from "./pages/EditProfile";
import ViewProfile from "./pages/ViewProfile";
import AlumniDirectory from "./pages/AlumniDirectory";
import PublicAlumniProfile from "./pages/PublicAlumniProfile";
import PublicStudentProfile from "./pages/PublicStudentProfile";
import FindMentor from "./pages/FindMentor";
import MentorshipInbox from "./pages/MentorshipInbox";
import MessagesInbox from "./pages/MessagesInbox";
import MessageThread from "./pages/MessageThread";
import EventsPage from "./pages/EventsPage";
import EventDetail from "./pages/EventDetail";
import MyFiles from "./pages/MyFiles";
import ForumPage from "./pages/ForumPage";
import ForumPostPage from "./pages/ForumPostPage";

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
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route path="/alumni/directory" element={<ProtectedRoute allowedRoles={["student","alumni","admin"]}><AlumniDirectory /></ProtectedRoute>} />
          <Route path="/alumni/:id" element={<ProtectedRoute allowedRoles={["student","alumni","admin"]}><PublicAlumniProfile /></ProtectedRoute>} />
          <Route path="/student/:id" element={<ProtectedRoute allowedRoles={["student","alumni","admin"]}><PublicStudentProfile /></ProtectedRoute>} />

          <Route path="/mentorship/find" element={<ProtectedRoute allowedRoles={["student"]}><FindMentor /></ProtectedRoute>} />
          <Route path="/mentorship/inbox" element={<ProtectedRoute allowedRoles={["alumni"]}><MentorshipInbox /></ProtectedRoute>} />

          <Route path="/messages" element={<ProtectedRoute allowedRoles={["student","alumni"]}><MessagesInbox /></ProtectedRoute>} />
          <Route path="/messages/:userId" element={<ProtectedRoute allowedRoles={["student","alumni"]}><MessageThread /></ProtectedRoute>} />

          <Route path="/events" element={<ProtectedRoute allowedRoles={["student","alumni","admin"]}><EventsPage /></ProtectedRoute>} />
          <Route path="/events/:id" element={<ProtectedRoute allowedRoles={["student","alumni","admin"]}><EventDetail /></ProtectedRoute>} />

          <Route path="/my-files" element={<ProtectedRoute allowedRoles={["student","alumni"]}><MyFiles /></ProtectedRoute>} />
          <Route path="/forum" element={<ProtectedRoute allowedRoles={["student","alumni","admin"]}><ForumPage /></ProtectedRoute>} />
          <Route path="/forum/:id" element={<ProtectedRoute allowedRoles={["student","alumni","admin"]}><ForumPostPage /></ProtectedRoute>} />

          <Route path="/dashboard/student" element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/alumni" element={<ProtectedRoute allowedRoles={["alumni"]}><AlumniDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />

          <Route path="/profile/create" element={<ProtectedRoute allowedRoles={["student","alumni"]}><CreateProfile /></ProtectedRoute>} />
          <Route path="/profile/edit" element={<ProtectedRoute allowedRoles={["student","alumni"]}><EditProfile /></ProtectedRoute>} />
          <Route path="/profile/view" element={<ProtectedRoute allowedRoles={["student","alumni"]}><ViewProfile /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
