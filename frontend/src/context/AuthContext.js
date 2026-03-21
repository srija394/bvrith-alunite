import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../utils/api";

const AuthContext = createContext();

// Decode JWT payload without a library
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { token, role, email, id, isApproved, needsEmailUpdate }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const email = localStorage.getItem("email");
    if (token && role) {
      const { id, isApproved } = parseJwt(token);
      const needsEmailUpdate =
        localStorage.getItem("needsEmailUpdate") === "true";
      setUser({ token, role, email, id, isApproved: !!isApproved, needsEmailUpdate });
    }
    setLoading(false);
  }, []);

  const login = (token, role, email) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("email", email || "");
    localStorage.setItem("needsEmailUpdate", "false");
    const { id, isApproved } = parseJwt(token);
    setUser({ token, role, email, id, isApproved: !!isApproved, needsEmailUpdate: false });
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  // Call /api/auth/me to re-sync user state (e.g. after conversion or email update)
  const refreshUser = useCallback(async () => {
    try {
      const res = await API.get("/auth/me");
      const { email, role, isApproved, needsEmailUpdate } = res.data;
      localStorage.setItem("email", email);
      localStorage.setItem("needsEmailUpdate", String(needsEmailUpdate));
      setUser((prev) => ({ ...prev, email, role, isApproved, needsEmailUpdate }));
    } catch {
      // Silently ignore — if the token is bad the user will be redirected elsewhere
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}