import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { toastManager } from "@/components/ui/toast";
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
  return useMutation({
    mutationFn: useConvexMutation(api.apiKeys.save),
    onError: (error) => {
      showMutationErrorToast(
        "Failed to save API key",
        error,
        "Could not save API key"
      );
    },
  });
}

export function useRemoveApiKeyMutation() {
  return useMutation({
    mutationFn: useConvexMutation(api.apiKeys.remove),
    onError: (error) => {
      showMutationErrorToast(
        "Failed to remove API key",
        error,
        "Could not remove API key"
      );
    },
  });
}
