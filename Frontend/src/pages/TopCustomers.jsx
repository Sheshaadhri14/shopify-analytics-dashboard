import React from "react";
import { useTopCustomers } from "../api/hooks/analytics";

export default function TopCustomersPage() {
  const { data = [], isLoading, isError, error } = useTopCustomers();

  if (isLoading) return <div className="p-6">Loading...</div>;
  if (isError) return <div className="p-6 text-red-600">Error: {error.message}</div>;

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Top 5 Customers</h2>
      <div className="bg-white p-4 rounded shadow">
        {data.length > 0 ? (
          <table className="w-full">
            <thead className="text-left text-sm text-gray-500">
              <tr>
                <th>Name</th>
                <th>Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c, i) => (
                <tr key={i} className="border-t">
                  <td className="py-2">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="py-2">
                    ${parseFloat(c.total_spent || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 text-gray-500">No customer data available</div>
        )}
      </div>
    </div>
  );
}
