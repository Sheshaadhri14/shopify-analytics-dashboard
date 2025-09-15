// src/pages/Customers.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import KpiCard from "../components/ui/KpiCard";
import Table from "../components/ui/Table";

export default function Customers() {
  const { data, isLoading } = useQuery({
    queryKey: ["customers-insights"],
    queryFn: async () => (await api.get("/insights/customers")).data,
  });

  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>Error loading data</div>;

  const columns = [
    { header: "Email", accessorKey: "email" },
    { header: "Total Spent", accessorKey: "total_spent" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  <main className="max-w-7xl mx-auto p-6 space-y-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <KpiCard title="Total Customers" value={data.total_customers} />
      <KpiCard title="New This Month" value={data.new_customers_month} />
      <KpiCard title="New This Week" value={data.new_customers_week} />
      <KpiCard title="Active (90d)" value={data.active_customers} />
      <KpiCard title="Inactive" value={data.inactive_customers} />
    </div>

    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Top Customers by Revenue
      </h3>
      <Table columns={columns} data={data.top_customers} />
    </div>
  </main>
</div>

  );
}
