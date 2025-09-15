import React from "react";
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";

export default function Table({ columns, data = [] }) {
  const table = useReactTable({ columns, data, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="overflow-x-auto bg-white rounded shadow">
      <table className="min-w-full">
        <thead className="bg-gray-100">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(header => (
                <th key={header.id} className="px-4 py-2 text-left text-sm font-medium">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-t">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-2 text-sm align-top">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td className="p-6 text-center text-sm text-gray-500" colSpan={columns.length}>No rows</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
