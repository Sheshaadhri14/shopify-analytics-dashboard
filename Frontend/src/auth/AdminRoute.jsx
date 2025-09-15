// src/auth/AdminRoute.jsx
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function AdminRoute({ children }) {
  const { token, user } = useContext(AuthContext);

  if (!token) return <Navigate to="/login" replace />;
  if (!user?.is_admin) return <Navigate to="/dashboard" replace />;

  return children;
}
