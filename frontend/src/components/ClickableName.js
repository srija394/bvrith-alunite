import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * ClickableName
 * Renders a person's name as a clickable link that navigates to their public profile.
 *
 * Props:
 *   name      {string}  – Display name (required)
 *   userId    {string}  – The user's _id (required)
 *   role      {string}  – "student" | "alumni" | "admin"
 *   style     {object}  – Optional extra inline styles
 *   className {string}  – Optional extra class
 */
export default function ClickableName({ name, userId, role, style = {}, className = "" }) {
  const navigate = useNavigate();

  // Admins don't have a public profile page — render plain text
  if (!userId || role === "admin") {
    return <span className={className} style={style}>{name}</span>;
  }

  const path = role === "alumni" ? `/alumni/${userId}` : `/student/${userId}`;

  return (
    <span
      className={`clickable-name ${className}`}
      style={{
        cursor: "pointer",
        color: "inherit",
        fontWeight: "inherit",
        textDecoration: "underline",
        textDecorationColor: "rgba(0,0,0,0.25)",
        textUnderlineOffset: "2px",
        transition: "color 0.15s",
        ...style,
      }}
      onClick={(e) => {
        e.stopPropagation();
        navigate(path);
      }}
      title={`View ${role} profile`}
    >
      {name}
    </span>
  );
}