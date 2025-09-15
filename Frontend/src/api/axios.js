// src/api/axios.js
import axios from "axios";

const API_ROOT = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_ROOT,
  withCredentials: true,
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // ✅ unified
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const tenant = localStorage.getItem("current_tenant");
    if (tenant) {
      config.headers["X-Tenant-Id"] = tenant;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        localStorage.clear();
        window.location.href = "/login";
      } else if (error.response.status === 403) {
        console.warn("Forbidden: You don’t have permission for this action.");
      }
    } else {
      console.error("Network/Server error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
