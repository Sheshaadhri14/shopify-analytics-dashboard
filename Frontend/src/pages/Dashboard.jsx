import React, { useEffect } from "react";
import Navbar from "../components/layout/Navbar";
import KpiCard from "../components/ui/KpiCard";
import LineChart from "../components/charts/LineChart";
import BarChart from "../components/charts/BarChart";
import {
  useOverview,
  useRevenueTrends,
  useTopCustomers,
  useBranchPerformance,
  useAbandonment,
} from "../api/hooks/analytics";
import { socket } from "../api/socket";
import { useQueryClient } from "@tanstack/react-query";

// ... imports unchanged

export default function Dashboard() {
  const qc = useQueryClient();

  const { data: overview, isError: overviewErr } = useOverview();
  const { data: revenue = [], isError: revenueErr } = useRevenueTrends();
  const { data: topCustomers = [], isError: topErr } = useTopCustomers();
  const { data: branchPerf = [], isError: branchErr } = useBranchPerformance();
  const { isError: abndErr } = useAbandonment();

  useEffect(() => {
    socket.connect();
    const tenant = localStorage.getItem("current_tenant");
    if (tenant) socket.emit("joinTenant", tenant);

    socket.on("shopify_event", () => qc.invalidateQueries());
    return () => {
      socket.off("shopify_event");
      socket.disconnect();
    };
  }, [qc]);

  const revenueData = revenue.map(r => ({
    date: new Date(r.month).toLocaleDateString(),
    revenue: parseFloat(r.revenue || 0),
  }));

  const customersBar = topCustomers.map(c => ({
    name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email || "Unknown",
    value: parseFloat(c.total_spent || 0),
  }));

  const branchBar = branchPerf.map(b => ({
    name: b.name || "Branch",
    value: parseFloat(b.revenue || 0),
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  <main className="max-w-7xl mx-auto p-6 space-y-6">
    {/* KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <KpiCard title="Customers" value={overview?.total_customers ?? 0} />
      <KpiCard title="Orders" value={overview?.total_orders ?? 0} />
      <KpiCard title="Revenue" value={`$${overview?.total_revenue ?? 0}`} />
    </div>

    {/* Revenue Chart */}
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Revenue (Monthly)
      </h3>
      {revenueData.length > 0 ? (
        <LineChart data={revenueData} dataKeyX="date" dataKeyY="revenue" />
      ) : (
        <div className="p-4 text-gray-500 dark:text-gray-400">No revenue data</div>
      )}
    </div>

    {/* Top Customers */}
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Top Customers
      </h3>
      {customersBar.length > 0 ? (
        <BarChart data={customersBar} dataKeyX="name" dataKeyY="value" />
      ) : (
        <div className="p-4 text-gray-500 dark:text-gray-400">No customer data</div>
      )}
    </div>

    {/* Branch Performance */}
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Branch Performance
      </h3>
      {branchBar.length > 0 ? (
        <BarChart data={branchBar} dataKeyX="name" dataKeyY="value" />
      ) : (
        <div className="p-4 text-gray-500 dark:text-gray-400">No branch data</div>
      )}
    </div>

    {/* Error Message */}
    {(overviewErr || revenueErr || topErr || branchErr || abndErr) && (
      <p className="text-red-500 mt-4">Some data failed to load</p>
    )}
  </main>
</div>

  );
}
