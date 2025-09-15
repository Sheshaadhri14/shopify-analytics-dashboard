import React from "react";
import AppRoutes from "./routes/AppRoutes";
import Navbar from "./components/layout/Navbar";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      
        <AppRoutes />
      
    </div>
  );
}
