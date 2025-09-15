import React from "react";
import api from "../api/axios";
import { useQuery } from "@tanstack/react-query";
import KpiCard from "../components/ui/KpiCard";

const fetchGlobalStats = async () => {
  const res = await api.get("/analytics/global-overview");
  return res.data;
};

export default function GlobalDashboard() {
  const { data, isLoading, isError } = useQuery(["globalStats"], fetchGlobalStats);

  if (isLoading)
    return <div className="p-6 flex justify-center items-center text-gray-500">Loading...</div>;
  if (isError)
    return (
      <div className="p-6 flex justify-center items-center text-red-500 font-semibold">
        Failed to load data
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  <main className="max-w-7xl mx-auto p-6 space-y-6">
    {/* Page Title */}
    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
      Global Dashboard (Admin)
    </h1>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard title="Total Tenants" value={data?.total_tenants ?? 0} />
      <KpiCard title="Total Customers" value={data?.total_customers ?? 0} />
      <KpiCard title="Total Orders" value={data?.total_orders ?? 0} />
      <KpiCard
        title="Total Revenue"
        value={`$${data?.total_revenue ?? 0}`}
      />
    </div>

    {/* Tenant Stats Table */}
    {data?.tenant_stats?.length > 0 && (
  <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
    <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
      Tenant Stats
    </h2>
    <table className="w-full text-left border-collapse">
      <thead className="bg-gray-100 dark:bg-gray-700 text-sm text-gray-500 dark:text-gray-400">
        <tr>
          <th className="py-2 px-4">Tenant</th>
          <th className="py-2 px-4">Customers</th>
          <th className="py-2 px-4">Orders</th>
          <th className="py-2 px-4">Revenue</th>
        </tr>
      </thead>
      <tbody>
        {data.tenant_stats.map((t) => (
          <tr
            key={t.tenant_id}
            className="border-t border-gray-200 dark:border-gray-600"
          >
            <td className="py-2 px-4">{t.display_name || t.store_domain}</td>
            <td className="py-2 px-4">{t.customers}</td>
            <td className="py-2 px-4">{t.orders}</td>
            <td className="py-2 px-4">${t.revenue}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

  </main>
</div>


  );
}
