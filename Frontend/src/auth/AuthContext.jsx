// src/auth/AuthContext.jsx
import React, { createContext, useEffect, useState } from "react";
import api from "../api/axios";
import jwt_decode from "jwt-decode";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwt_decode(token);

        // check expiry
        if (decoded.exp * 1000 < Date.now()) {
          logout();
          return;
        }

        // ensure consistent format
        setUser((prev) =>
          prev || {
            userId: decoded.userId,
            tenantId: decoded.tenantId,
            is_admin: !!decoded.is_admin, // normalize to boolean
          }
        );
      } catch (e) {
        console.error("Invalid JWT", e);
        logout();
      }
    }
  }, [token]);

  // ✅ Updated to /api/v1/auth/login
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    if (res.data?.token) {
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);

      if (res.data.user) {
        // normalize is_admin field
        const normalizedUser = {
          ...res.data.user,
          is_admin: !!res.data.user.is_admin,
        };

        localStorage.setItem("user", JSON.stringify(normalizedUser));
        setUser(normalizedUser);

        if (normalizedUser.tenant_id) {
          localStorage.setItem("current_tenant", normalizedUser.tenant_id);
        }
      }
    }
    return res.data;
  };

  // ✅ Updated to /api/v1/auth/register
  const register = async (email, password, tenant_id = null, is_admin = false) => {
    const res = await api.post("/auth/register", {
      email,
      password,
      tenant_id,
      is_admin,
    });
    return res.data;
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}
