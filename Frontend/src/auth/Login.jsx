// src/auth/Login.jsx
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const data = await login(email, password);

      if (data?.token && data?.user) {
        // ✅ Save using the SAME keys AuthContext + axios expect
        localStorage.setItem("token", data.token);
        localStorage.setItem("current_tenant", data.user.tenant_id);
        localStorage.setItem("is_admin", data.user.is_admin ? "1" : "0");
        localStorage.setItem("user_email", data.user.email);

        // Redirect based on role
        if (data.user.is_admin) {
          nav("/global-dashboard");
        } else {
          nav("/dashboard");
        }
      }
    } catch (error) {
      setErr(error.response?.data?.error || "Login failed. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={submit}
        className="bg-white p-8 rounded shadow w-full max-w-md"
      >
        <h2 className="text-2xl mb-4">Sign in</h2>
        {err && (
          <div className="p-2 bg-red-100 text-red-700 mb-2 rounded">{err}</div>
        )}

        <label className="block mb-2">
          <div className="text-sm">Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-2 w-full rounded"
          />
        </label>

        <label className="block mb-4">
          <div className="text-sm">Password</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 w-full rounded"
          />
        </label>

        <button className="w-full bg-blue-600 text-white p-2 rounded">
          Login
        </button>

        <p className="mt-4 text-sm">
          New user?{" "}
          <span
            onClick={() => nav("/register")}
            className="text-blue-600 cursor-pointer"
          >
            Register
          </span>
        </p>
      </form>
    </div>
  );
}
