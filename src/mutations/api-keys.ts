import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toastManager } from "@/components/ui/toast";
import { apiKeysListQuery } from "@/queries/api-keys";
import { api } from "../../convex/_generated/api";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function showMutationErrorToast(
  title: string,
  error: unknown,
  fallback: string
) {
  toastManager.add({
    description: getErrorMessage(error, fallback),
    title,
    type: "error",
  });
}

export function useSaveApiKeyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: useConvexMutation(api.apiKeys.save),
    onError: (error) => {
      showMutationErrorToast(
        "Failed to save API key",
        error,
        "Could not save API key"
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: apiKeysListQuery().queryKey,
      });
    },
  });
}

export function useRemoveApiKeyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: useConvexMutation(api.apiKeys.remove),
    onError: (error) => {
      showMutationErrorToast(
        "Failed to remove API key",
        error,
        "Could not remove API key"
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: apiKeysListQuery().queryKey,
      });
    },
  });
}
