import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../axios";

export const useOrders = () =>
  useQuery(["orders"], async () => {
    const { data } = await api.get("/orders");
    return Array.isArray(data) ? data : [];
  });

export const useOrder = (id) =>
  useQuery(
    ["order", id],
    async () => {
      const { data } = await api.get(`/orders/${id}`);
      return data || {};
    },
    { enabled: !!id }
  );

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation(
    async (payload) => {
      const { data } = await api.post("/orders", payload);
      return data;
    },
    { onSuccess: () => qc.invalidateQueries(["orders"]) }
  );
};

export const useUpdateOrder = () => {
  const qc = useQueryClient();
  return useMutation(
    async ({ id, ...payload }) => {
      const { data } = await api.put(`/orders/${id}`, payload);
      return data;
    },
    {
      onSuccess: (_, { id }) => {
        qc.invalidateQueries(["orders"]);
        qc.invalidateQueries(["order", id]);
      },
    }
  );
};

export const useDeleteOrder = () => {
  const qc = useQueryClient();
  return useMutation(
    async (id) => {
      await api.delete(`/orders/${id}`);
      return id;
    },
    { onSuccess: () => qc.invalidateQueries(["orders"]) }
  );
};
