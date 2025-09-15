import React, { useEffect, useState } from "react";
import api from "../../api/axios";

export default function StoreSwitcher({ isAdmin }) {
  const [tenants, setTenants] = useState([]);
  const [val, setVal] = useState(localStorage.getItem("current_tenant") || "");

  useEffect(() => {
    if (isAdmin) {
      api
        .get("/tenants")
        .then((res) => {
          // Backend returns { success: true, data: [...] }
          setTenants(res.data.data || []);
        })
        .catch((err) => {
          console.error("Failed to fetch tenants:", err);
        });
    }
  }, [isAdmin]);

  function change(v) {
    setVal(v);
    localStorage.setItem("current_tenant", v);
    // Reload to trigger tenant-specific data fetch
    window.location.reload();
  }

  if (!isAdmin) return null;

  return (
    <select
      value={val}
      onChange={(e) => change(e.target.value)}
      className="border rounded p-2 text-sm
                 bg-white dark:bg-gray-800
                 text-gray-900 dark:text-gray-200
                 border-gray-300 dark:border-gray-600
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">Select Store</option>
      {tenants.map((t) => (
        <option key={t.tenant_id} value={t.tenant_id}>
          {t.display_name || t.store_domain}
        </option>
      ))}
    </select>
  );
}
