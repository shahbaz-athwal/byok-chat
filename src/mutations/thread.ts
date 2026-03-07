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

export function useStartThreadMutation() {
  return useMutation({
    mutationFn: useConvexMutation(api.threads.start),
    onError: (error) => {
      showMutationErrorToast(
        "Failed to start chat",
        error,
        "Could not start chat"
      );
    },
  });
}

export function useSendThreadMessageMutation() {
  return useMutation({
    mutationFn: useConvexMutation(api.messages.send),
    onError: (error) => {
      showMutationErrorToast(
        "Failed to send message",
        error,
        "Could not send message"
      );
    },
  });
}

export function useUpdateThreadModelMutation() {
  return useMutation({
    mutationFn: useConvexMutation(api.threads.updateModel),
    onError: (error) => {
      showMutationErrorToast(
        "Failed to update model",
        error,
        "Could not update model"
      );
    },
  });
}

export function useRemoveThreadMutation() {
  return useMutation({
    mutationFn: useConvexMutation(api.threads.remove),
    onError: (error) => {
      showMutationErrorToast(
        "Failed to remove chat",
        error,
        "Could not remove chat"
      );
    },
  });
}
