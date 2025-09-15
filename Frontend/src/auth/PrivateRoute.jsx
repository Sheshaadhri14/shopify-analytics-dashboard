// src/auth/PrivateRoute.jsx
import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function PrivateRoute({ children }) {
  const { token } = useContext(AuthContext);

  if (!token) return <Navigate to="/login" replace />;

  return children;
}
