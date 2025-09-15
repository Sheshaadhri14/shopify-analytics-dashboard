import React, { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const isDark = theme !== "dark";
    if (isDark) {
      document.documentElement.classList.add("dark");
      setTheme("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      setTheme("light");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="px-4 py-2 rounded-md transition-colors duration-200
                 bg-gray-200 dark:bg-gray-700
                 text-gray-800 dark:text-gray-200
                 hover:bg-gray-300 dark:hover:bg-gray-600
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {theme === "dark" ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
