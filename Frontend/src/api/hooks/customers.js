import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../axios";

export const useCustomers = () =>
  useQuery(["customers"], async () => {
    const { data } = await api.get("/customers");
    return Array.isArray(data) ? data : [];
  });

export const useCustomer = (id) =>
  useQuery(
    ["customer", id],
    async () => {
      const { data } = await api.get(`/customers/${id}`);
      return data || {};
    },
    { enabled: !!id }
  );

export const useCreateCustomer = () => {
  const qc = useQueryClient();
  return useMutation(
    async (payload) => {
      const { data } = await api.post("/customers", payload);
      return data;
    },
    { onSuccess: () => qc.invalidateQueries(["customers"]) }
  );
};

export const useUpdateCustomer = () => {
  const qc = useQueryClient();
  return useMutation(
    async ({ id, ...payload }) => {
      const { data } = await api.put(`/customers/${id}`, payload);
      return data;
    },
    {
      onSuccess: (_, { id }) => {
        qc.invalidateQueries(["customers"]);
        qc.invalidateQueries(["customer", id]);
      },
    }
  );
};

export const useDeleteCustomer = () => {
  const qc = useQueryClient();
  return useMutation(
    async (id) => {
      await api.delete(`/customers/${id}`);
      return id;
    },
    { onSuccess: () => qc.invalidateQueries(["customers"]) }
  );
};
