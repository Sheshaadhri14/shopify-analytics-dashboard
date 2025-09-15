import React from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import ThemeToggle from "../ui/ThemeToggle";

const commonNav = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/revenue-trends", label: "Revenue" },
  { path: "/customers", label: "Customers" },
  { path: "/top-customers", label: "Top Customers" },
  { path: "/orders", label: "Orders" },
  { path: "/products", label: "Products" },
  { path: "/events", label: "Events" },
];

const adminNav = [
  { path: "/global-dashboard", label: "Global Dashboard" },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const navItems = user?.is_admin ? [...adminNav, ...commonNav] : commonNav;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-md hidden md:flex flex-col">
        <div className="p-4 font-bold text-lg text-gray-900 dark:text-gray-100">
          Xeno Insights
        </div>
        <nav className="flex flex-col flex-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 text-sm ${
                pathname === item.path
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <ThemeToggle />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <Navbar /> {/* topbar with user controls */}
        <main className="p-6 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
