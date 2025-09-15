// src/pages/Orders.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import KpiCard from "../components/ui/KpiCard";
import Table from "../components/ui/Table";

export default function Orders() {
  const { data, isLoading } = useQuery({
    queryKey: ["orders-insights"],
    queryFn: async () => (await api.get("/insights/orders")).data,
  });

  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>Error loading data</div>;

  const columns = [
    { header: "Status", accessorKey: "financial_status" },
    { header: "Count", accessorKey: "count" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  <main className="max-w-7xl mx-auto p-6 space-y-6">
    {/* KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard title="Total Orders" value={data.total_orders} />
      <KpiCard
        title="Total Revenue"
        value={`₹${data.total_revenue.toFixed(2)}`}
      />
      <KpiCard
        title="Avg. Order Value"
        value={`₹${data.avg_order_value.toFixed(2)}`}
      />
      <KpiCard title="Unique Customers" value={data.unique_customers} />
    </div>

    {/* Orders by Status */}
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Orders by Status
      </h3>
      <Table columns={columns} data={data.orders_by_status} />
    </div>

    {/* Orders Trend */}
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Orders Trend (30 Days)
      </h3>
      <ul className="space-y-2 text-gray-700 dark:text-gray-300">
        {data.orders_trend.map((t) => (
          <li key={t.day}>
            {t.day}: {t.orders} orders
          </li>
        ))}
      </ul>
    </div>
  </main>
</div>

  );
}
