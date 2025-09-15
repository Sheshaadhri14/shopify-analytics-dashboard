import React, { useContext } from "react";
import { AuthContext } from "../../auth/AuthContext";
import StoreSwitcher from "../layout/StoreSwitcher";
import ThemeToggle from "../ui/ThemeToggle";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);

  if (!user) return null;

  return (
    <nav className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white px-6 py-3 flex justify-between items-center shadow-md">
      {/* Left: welcome */}
      <span className="font-bold">Welcome, {user.email || "User"}</span>

      {/* Right: controls */}
      <div className="flex items-center space-x-4">
        {user.is_admin && <StoreSwitcher isAdmin />}
       
        <button
          onClick={logout}
          className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-md text-sm text-white"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
