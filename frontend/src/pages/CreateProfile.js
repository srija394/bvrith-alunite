import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ProfileForm from "../components/ProfileForm";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./ProfilePages.css";

export default function CreateProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // If profile already exists, redirect to edit
  useEffect(() => {
    API.get("/profile/me").then((res) => {
      if (res.data.exists) navigate("/profile/edit", { replace: true });
    }).catch(() => {});
  }, [navigate]);

  const handleSubmit = async (data) => {
    setError("");
    setLoading(true);
    try {
      await API.post("/profile/me", data);
      const dest = user?.role === "admin"
        ? "/dashboard/admin"
        : user?.role === "alumni"
        ? "/dashboard/alumni"
        : "/dashboard/student";
      navigate(dest);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="profile-page-container">
        <div className="profile-page-header">
          <h1>🧑‍🎓 Complete Your Profile</h1>
          <p>Fill in your details to get started on the BVRITH Alunite portal.</p>
        </div>
        {error && <div className="page-error">{error}</div>}
        <ProfileForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </>
  );
}
