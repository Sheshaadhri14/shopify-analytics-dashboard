import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../axios";

export const useProducts = () =>
  useQuery(["products"], async () => {
    const { data } = await api.get("/products");
    return Array.isArray(data) ? data : [];
  });

export const useProduct = (id) =>
  useQuery(
    ["product", id],
    async () => {
      const { data } = await api.get(`/products/${id}`);
      return data || {};
    },
    { enabled: !!id }
  );

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation(
    async (payload) => {
      const { data } = await api.post("/products", payload);
      return data;
    },
    { onSuccess: () => qc.invalidateQueries(["products"]) }
  );
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation(
    async ({ id, ...payload }) => {
      const { data } = await api.put(`/products/${id}`, payload);
      return data;
    },
    {
      onSuccess: (_, { id }) => {
        qc.invalidateQueries(["products"]);
        qc.invalidateQueries(["product", id]);
      },
    }
  );
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation(
    async (id) => {
      await api.delete(`/products/${id}`);
      return id;
    },
    { onSuccess: () => qc.invalidateQueries(["products"]) }
  );
};
