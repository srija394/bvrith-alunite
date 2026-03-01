import React, { createContext, useContext, useState, useEffect } from "react";

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
  const [user, setUser] = useState(null); // { token, role, email, id, isApproved }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const email = localStorage.getItem("email");
    if (token && role) {
      const { id, isApproved } = parseJwt(token);
      setUser({ token, role, email, id, isApproved: !!isApproved });
    }
    setLoading(false);
  }, []);

  const login = (token, role, email) => {
    localStorage.setItem("token", token);
    localStorage.setItem("role", role);
    localStorage.setItem("email", email || "");
    const { id, isApproved } = parseJwt(token);
    setUser({ token, role, email, id, isApproved: !!isApproved });
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}