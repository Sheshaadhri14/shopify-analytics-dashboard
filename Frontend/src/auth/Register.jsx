import { useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", storeId: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/auth/register", form); // ✅ using default export
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Network Error");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow-md w-96">
        <h2 className="text-xl font-bold mb-4">Register</h2>
        {error && <div className="bg-red-100 text-red-600 p-2 mb-2 rounded">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label className="block mb-2">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full p-2 mb-4 border rounded"
            required
          />

          <label className="block mb-2">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="w-full p-2 mb-4 border rounded"
            required
          />

          <label className="block mb-2">Store ID</label>
          <input
            type="text"
            name="storeId"
            value={form.storeId}
            onChange={handleChange}
            className="w-full p-2 mb-4 border rounded"
            required
          />

          <button type="submit" className="w-full bg-green-600 text-white py-2 rounded">
            Register
          </button>
        </form>

        <p className="mt-4 text-sm">
          Already have an account?{" "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}
