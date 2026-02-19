import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ProfileForm from "../components/ProfileForm";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./ProfilePages.css";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    API.get("/profile/me")
      .then((res) => {
        if (!res.data.exists) navigate("/profile/create", { replace: true });
        else setInitial(res.data.profile);
      })
      .catch(() => navigate("/profile/create", { replace: true }))
      .finally(() => setFetching(false));
  }, [navigate]);

  const handleSubmit = async (data) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await API.put("/profile/me", data);
      setSuccess("Profile updated successfully!");
      window.scrollTo(0, 0);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const dashboardLink = user?.role === "alumni"
    ? "/dashboard/alumni"
    : user?.role === "admin"
    ? "/dashboard/admin"
    : "/dashboard/student";

  if (fetching) return <><Navbar /><div className="loading">Loading profile...</div></>;

  return (
    <>
      <Navbar />
      <div className="profile-page-container">
        <div className="profile-page-header">
          <div>
            <h1>✏️ Edit Profile</h1>
            <p>Keep your information up to date.</p>
          </div>
          <div className="header-actions">
            <button className="btn-view" onClick={() => navigate("/profile/view")}>View Profile</button>
            <button className="btn-back" onClick={() => navigate(dashboardLink)}>← Dashboard</button>
          </div>
        </div>
        {error && <div className="page-error">{error}</div>}
        {success && <div className="page-success">{success}</div>}
        {initial && <ProfileForm initial={initial} onSubmit={handleSubmit} loading={loading} />}
      </div>
    </>
  );
}
