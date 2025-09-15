import React, { useState } from "react";
import LineChart from "../components/charts/LineChart";
import { useRevenueTrends } from "../api/hooks/analytics";

export default function RevenueTrendsPage() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const { data = [], isLoading, isError, error } = useRevenueTrends(start, end);

  const formatted = data.map(r => ({
  date: r.month, // "YYYY-MM" string
  revenue: parseFloat(r.revenue || 0),
}));


  if (isLoading) return <div className="p-6">Loading...</div>;
  if (isError) return <div className="p-6 text-red-600">Error: {error.message}</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  <main className="max-w-6xl mx-auto p-6 space-y-6">
    {/* Date Range Filter */}
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <input
        type="date"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        className="border rounded p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
      />
      <input
        type="date"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        className="border rounded p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
      />
    </div>

    {/* Revenue Chart */}
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <h2 className="mb-2 font-semibold text-gray-800 dark:text-gray-200">
        Revenue
      </h2>
      {formatted.length > 0 ? (
        <LineChart data={formatted} dataKeyX="date" dataKeyY="revenue" />
      ) : (
        <div className="text-gray-500 dark:text-gray-400">
          No data available for selected range
        </div>
      )}
    </div>
  </main>
</div>

  );
}
