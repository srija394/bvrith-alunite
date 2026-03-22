import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../utils/api";

const AuthContext = createContext();

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    const email = localStorage.getItem("email");
    if (token && role) {
      const { id, isApproved } = parseJwt(token);
      const needsEmailUpdate    = localStorage.getItem("needsEmailUpdate") === "true";
      const mustChangePassword  = localStorage.getItem("mustChangePassword") === "true";
      setUser({ token, role, email, id, isApproved: !!isApproved, needsEmailUpdate, mustChangePassword });
    }
    setLoading(false);
  }, []);

  const login = (token, role, email, mustChangePassword = false) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("email", email || "");
    localStorage.setItem("needsEmailUpdate", "false");
    localStorage.setItem("mustChangePassword", String(!!mustChangePassword));
    const { id, isApproved } = parseJwt(token);
    setUser({ token, role, email, id, isApproved: !!isApproved, needsEmailUpdate: false, mustChangePassword: !!mustChangePassword });
  };

  // Called after successful password change — clears the flag
  const clearMustChangePassword = (newToken) => {
    localStorage.setItem("mustChangePassword", "false");
    if (newToken) localStorage.setItem("token", newToken);
    setUser((prev) => ({ ...prev, mustChangePassword: false, token: newToken || prev.token }));
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    try {
      const res = await API.get("/auth/me");
      const { email, role, isApproved, needsEmailUpdate, mustChangePassword } = res.data;
      localStorage.setItem("email", email);
      localStorage.setItem("needsEmailUpdate", String(needsEmailUpdate));
      localStorage.setItem("mustChangePassword", String(!!mustChangePassword));
      setUser((prev) => ({ ...prev, email, role, isApproved, needsEmailUpdate, mustChangePassword: !!mustChangePassword }));
    } catch {}
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser, clearMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}