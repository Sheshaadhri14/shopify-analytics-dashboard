// src/pages/Products.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import KpiCard from "../components/ui/KpiCard";
import Table from "../components/ui/Table";

export default function Products() {
  const { data, isLoading } = useQuery({
    queryKey: ["products-insights"],
    queryFn: async () => (await api.get("/insights/products")).data,
  });

  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>Error loading data</div>;

  const topColumns = [
    { header: "Title", accessorKey: "title" },
    { header: "Total Sales", accessorKey: "total_sales" },
  ];

  const lowStockColumns = [
    { header: "Title", accessorKey: "title" },
    { header: "Inventory", accessorKey: "inventory_quantity" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  <main className="max-w-7xl mx-auto p-6 space-y-6">
    {/* KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <KpiCard title="Total Products" value={data.total_products} />
      <KpiCard title="Avg. Price" value={`₹${data.avg_price.toFixed(2)}`} />
      <KpiCard title="Low Inventory" value={data.low_inventory_count} />
    </div>

    {/* Top-Selling Products */}
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Top-Selling Products
      </h3>
      <Table columns={topColumns} data={data.top_products} />
    </div>

    {/* Low Inventory Products */}
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Low Inventory Products
      </h3>
      <Table columns={lowStockColumns} data={data.low_inventory_products} />
    </div>
  </main>
</div>

  );
}
