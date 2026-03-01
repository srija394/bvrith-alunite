import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import API from "../utils/api";
import { useAuth } from "../context/AuthContext";
import "./MyFiles.css";

export default function MyFiles() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [files, setFiles] = useState({ resume: null, photo: null, certificates: [], graduationDoc: null });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({}); // { resume: bool, certificate: bool, photo: bool }
  const [certName, setCertName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resumeRef = useRef();
  const certRef = useRef();
  const photoRef = useRef();
  const gradDocRef = useRef();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const { data } = await API.get("/upload/my-files");
      setFiles(data);
    } catch {
      setError("Failed to load your files");
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleUpload = async (type, file, extra = {}) => {
    if (!file) return;
    setUploading((u) => ({ ...u, [type]: true }));
    setError("");

    const formData = new FormData();
    formData.append(type, file);
    if (extra.certName) formData.append("certName", extra.certName);

    try {
      const { data } = await API.post(`/upload/${type}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (type === "graduation-doc") {
        setFiles((f) => ({ ...f, graduationDoc: { name: data.fileName, url: data.url } }));
        showSuccess("Graduation document uploaded! Admin will review it during approval.");
      } else if (type === "resume") {
        setFiles((f) => ({ ...f, resume: { name: data.fileName, url: data.url } }));
        showSuccess("Resume uploaded successfully!");
      } else if (type === "certificate") {
        setFiles((f) => ({ ...f, certificates: [...f.certificates, data.certificate] }));
        showSuccess("Certificate uploaded successfully!");
        setCertName("");
      } else if (type === "photo") {
        setFiles((f) => ({ ...f, photo: { url: data.url } }));
        showSuccess("Profile photo uploaded successfully!");
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to upload ${type}`);
    } finally {
      setUploading((u) => ({ ...u, [type]: false }));
    }
  };

  const handleDeleteCert = async (key) => {
    if (!window.confirm("Delete this certificate?")) return;
    try {
      await API.delete(`/upload/certificate/${encodeURIComponent(key)}`);
      setFiles((f) => ({ ...f, certificates: f.certificates.filter((c) => c.key !== key) }));
      showSuccess("Certificate deleted");
    } catch {
      setError("Failed to delete certificate");
    }
  };

  return (
    <>
      <Navbar />
      <div className="myfiles-container">
        <div className="myfiles-header">
          <div>
            <h1>☁️ My Files</h1>
            <p>Upload and manage your resume, certificates, and profile photo</p>
          </div>
          <button className="btn-back" onClick={() => navigate("/profile/view")}>← My Profile</button>
        </div>

        {success && <div className="files-success">✅ {success}</div>}
        {error && <div className="files-error">⚠️ {error}</div>}

        {loading ? (
          <div className="files-loading"><div className="files-spinner" /><p>Loading your files...</p></div>
        ) : (
          <div className="files-grid">

            {/* ── Profile Photo ── */}
            <div className="file-card">
              <div className="file-card-header">
                <span className="file-icon">🖼️</span>
                <div>
                  <h3>Profile Photo</h3>
                  <p>JPG, PNG or WebP · Max 3MB</p>
                </div>
              </div>

              {files.photo?.url && (
                <div className="photo-preview">
                  <img src={files.photo.url} alt="Profile" />
                </div>
              )}

              <input
                ref={photoRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                style={{ display: "none" }}
                onChange={(e) => handleUpload("photo", e.target.files[0])}
              />
              <button
                className="btn-upload"
                disabled={uploading.photo}
                onClick={() => photoRef.current.click()}
              >
                {uploading.photo ? "Uploading..." : files.photo ? "Replace Photo" : "Upload Photo"}
              </button>
            </div>

            {/* ── Resume ── */}
            <div className="file-card">
              <div className="file-card-header">
                <span className="file-icon">📄</span>
                <div>
                  <h3>Resume / CV</h3>
                  <p>PDF, DOC or DOCX · Max 5MB</p>
                </div>
              </div>

              {files.resume && (
                <div className="file-existing">
                  <span className="file-name-icon">📎</span>
                  <div>
                    <p className="file-name">{files.resume.name}</p>
                    <a href={files.resume.url} target="_blank" rel="noreferrer" className="file-view-link">
                      View / Download
                    </a>
                  </div>
                </div>
              )}

              <input
                ref={resumeRef}
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: "none" }}
                onChange={(e) => handleUpload("resume", e.target.files[0])}
              />
              <button
                className="btn-upload"
                disabled={uploading.resume}
                onClick={() => resumeRef.current.click()}
              >
                {uploading.resume ? "Uploading..." : files.resume ? "Replace Resume" : "Upload Resume"}
              </button>
            </div>

            {/* ── Certificates ── */}
            <div className="file-card cert-card">
              <div className="file-card-header">
                <span className="file-icon">🏆</span>
                <div>
                  <h3>Certificates</h3>
                  <p>PDF, JPG or PNG · Max 10MB each</p>
                </div>
              </div>

              {/* Existing certificates */}
              {files.certificates.length > 0 && (
                <div className="cert-list">
                  {files.certificates.map((cert) => (
                    <div key={cert.key} className="cert-item">
                      <span className="cert-icon">🎖️</span>
                      <div className="cert-info">
                        <p className="cert-name">{cert.name}</p>
                        <a href={cert.url} target="_blank" rel="noreferrer" className="file-view-link">
                          View
                        </a>
                      </div>
                      <button
                        className="btn-delete-cert"
                        onClick={() => handleDeleteCert(cert.key)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload new certificate */}
              <div className="cert-upload-section">
                <input
                  type="text"
                  value={certName}
                  onChange={(e) => setCertName(e.target.value)}
                  placeholder="Certificate name (e.g. AWS Cloud Practitioner)"
                  className="cert-name-input"
                />
                <input
                  ref={certRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (!certName.trim()) {
                      setError("Please enter a certificate name first");
                      return;
                    }
                    handleUpload("certificate", e.target.files[0], { certName });
                    certRef.current.value = "";
                  }}
                />
                <button
                  className="btn-upload"
                  disabled={uploading.certificate}
                  onClick={() => {
                    if (!certName.trim()) { setError("Please enter a certificate name first"); return; }
                    setError("");
                    certRef.current.click();
                  }}
                >
                  {uploading.certificate ? "Uploading..." : "+ Add Certificate"}
                </button>
              </div>
            </div>

            {/* ── Graduation Document (Alumni only) ── */}
            {user?.role === "alumni" && (
              <div className="file-card grad-doc-card">
                <div className="file-card-header">
                  <span className="file-icon">🎓</span>
                  <div>
                    <h3>Graduation Document</h3>
                    <p>Marksheet or Degree Certificate · PDF/Image · Max 10MB</p>
                  </div>
                </div>

                <div className="grad-doc-notice">
                  ℹ️ Required for admin approval. Upload your college marksheet or graduation certificate.
                </div>

                {files.graduationDoc && (
                  <div className="file-existing">
                    <span className="file-name-icon">📎</span>
                    <div>
                      <p className="file-name">{files.graduationDoc.name}</p>
                      <a href={files.graduationDoc.url} target="_blank" rel="noreferrer" className="file-view-link">
                        View / Download
                      </a>
                    </div>
                  </div>
                )}

                <input
                  ref={gradDocRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    handleUpload("graduation-doc", e.target.files[0]);
                    gradDocRef.current.value = "";
                  }}
                />
                <button
                  className="btn-upload btn-upload-grad"
                  disabled={uploading["graduation-doc"]}
                  onClick={() => gradDocRef.current.click()}
                >
                  {uploading["graduation-doc"]
                    ? "Uploading..."
                    : files.graduationDoc
                    ? "Replace Document"
                    : "Upload Graduation Document"}
                </button>
              </div>
            )}

          </div>
        )}

        {/* Info box */}
        <div className="s3-info-box">
          <span>🔒</span>
          <p>
            All files are stored securely in <strong>AWS S3</strong> (ap-south-1 region) with
            private access. Download links expire after <strong>1 hour</strong> for security.
          </p>
        </div>
      </div>
    </>
  );
}
