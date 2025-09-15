// src/pages/Events.jsx
import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import KpiCard from "../components/ui/KpiCard";

export default function Events() {
  const { data, isLoading } = useQuery({
    queryKey: ["events-insights"],
    queryFn: async () => (await api.get("/insights/events")).data,
  });

  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>Error loading data</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Total Events" value={data.total_events} />
        <KpiCard title="Events (24h)" value={data.events_24h} />
        <KpiCard title="Events (7d)" value={data.events_7d} />
      </div>

      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Breakdown by Type</h3>
      <ul className="bg-white p-4 shadow rounded">
        {data.events_by_type.map((e) => (
          <li key={e.event_type}>
            {e.event_type}: {e.count}
          </li>
        ))}
      </ul>

      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Recent Events</h3>
      <ul className="bg-white p-4 shadow rounded">
        {data.recent_events.map((e) => (
          <li key={e.id}>
            [{e.created_at}] {e.event_type}
          </li>
        ))}
      </ul>
    </div>
  );
}
