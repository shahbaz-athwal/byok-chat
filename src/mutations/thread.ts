import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { toastManager } from "@/components/ui/toast";
import { applyActivateDraftOptimisticUpdate } from "@/lib/thread-drafts";
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

export interface EnsureDraftMutationOptions {
  showErrorToast?: boolean;
}

export function useEnsureDraftMutation(options?: EnsureDraftMutationOptions) {
  return useMutation({
    mutationFn: useConvexMutation(api.threads.ensureDraft),
    onError: (error) => {
      if (options?.showErrorToast === false) {
        return;
      }

      showMutationErrorToast(
        "Failed to prepare chat",
        error,
        "Could not prepare chat"
      );
    },
  });
}

export function useActivateDraftAndSendMutation() {
  const activateDraftAndSendMutation = useConvexMutation(
    api.threads.activateDraftAndSend
  ).withOptimisticUpdate((localStore, args) => {
    applyActivateDraftOptimisticUpdate(localStore, args);
  });

  return useMutation({
    mutationFn: activateDraftAndSendMutation,
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
