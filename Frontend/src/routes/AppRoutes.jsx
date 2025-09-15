import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PrivateRoute from "../auth/PrivateRoute";
import AdminRoute from "../auth/AdminRoute";

import Login from "../auth/Login";
import Register from "../auth/Register";

import Layout from "../components/layout/Layout"; // ✅ make sure path is correct

import Dashboard from "../pages/Dashboard";
import RevenueTrendsPage from "../pages/RevenueTrends";
import TopCustomersPage from "../pages/TopCustomers";
import CustomersPage from "../pages/Customers";
import OrdersPage from "../pages/Orders";
import ProductsPage from "../pages/Products";
import EventsPage from "../pages/Events";
import GlobalDashboard from "../pages/GlobalDashboard";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes with Layout */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/revenue-trends"
        element={
          <PrivateRoute>
            <Layout>
              <RevenueTrendsPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/top-customers"
        element={
          <PrivateRoute>
            <Layout>
              <TopCustomersPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <PrivateRoute>
            <Layout>
              <CustomersPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <PrivateRoute>
            <Layout>
              <OrdersPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/products"
        element={
          <PrivateRoute>
            <Layout>
              <ProductsPage />
            </Layout>
          </PrivateRoute>
        }
      />
      <Route
        path="/events"
        element={
          <PrivateRoute>
            <Layout>
              <EventsPage />
            </Layout>
          </PrivateRoute>
        }
      />

      {/* Admin-only routes */}
      <Route
        path="/global-dashboard"
        element={
          <AdminRoute>
            <Layout>
              <GlobalDashboard />
            </Layout>
          </AdminRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
