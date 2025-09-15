import { useQuery } from "@tanstack/react-query";
import api from "../axios";

export const useOverview = () =>
  useQuery(["overview"], async () => {
    const { data } = await api.get("/analytics/overview");
    // normalize keys if backend uses customers/orders/revenue
    return {
      total_customers: data.customers ?? data.total_customers ?? 0,
      total_orders: data.orders ?? data.total_orders ?? 0,
      total_revenue: data.revenue ?? data.total_revenue ?? 0,
      raw: data,
    };
  });

export const useRevenueTrends = (start, end) =>
  useQuery(["revenueTrends", start, end], async () => {
    const { data } = await api.get("/analytics/revenue-trends", { params: { start, end } });
    return data;
  });

export const useTopCustomers = () =>
  useQuery(["topCustomers"], async () => {
    const { data } = await api.get("/analytics/top-customers");
    return data;
  });

export const useBranchPerformance = () =>
  useQuery(["branchPerformance"], async () => {
    const { data } = await api.get("/analytics/branch-performance");
    return data;
  });

export const useAbandonment = () =>
  useQuery(["abandonment"], async () => {
    const { data } = await api.get("/analytics/abandonment");
    return data;
  });
