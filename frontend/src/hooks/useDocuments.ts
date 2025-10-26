import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentApi } from "../services/api";

export const useDocuments = () => {
  return useQuery({
    queryKey: ["documents"],
    queryFn: documentApi.list,
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: documentApi.upload,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: documentApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};
