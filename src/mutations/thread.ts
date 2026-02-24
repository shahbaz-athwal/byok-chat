import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import type { FunctionArgs } from "convex/server";
import { toastManager } from "@/components/ui/toast";
import { api } from "../../convex/_generated/api";

interface StartThreadMutationInput
  extends FunctionArgs<typeof api.threads.create> {
  prompt: string;
}

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
  const createThread = useConvexMutation(api.threads.create);
  const sendMessage = useConvexMutation(api.messages.send);

  return useMutation({
    mutationFn: async ({
      provider,
      modelId,
      prompt,
    }: StartThreadMutationInput) => {
      const { chatId, threadId } = await createThread({
        modelId,
        provider,
      });
      const messageId = await sendMessage({ chatId, prompt });

      return { chatId, messageId, threadId };
    },
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

export function useUpdateThreadTitleMutation() {
  return useMutation({
    mutationFn: useConvexMutation(api.threads.updateTitle),
    onError: (error) => {
      showMutationErrorToast(
        "Failed to update title",
        error,
        "Could not update title"
      );
    },
  });
}

export function useRemoveThreadMutation() {
  return useMutation({
    mutationFn: useConvexMutation(api.threads.remove),
    onError: (error) => {
      showMutationErrorToast(
        "Failed to delete chat",
        error,
        "Could not delete chat"
      );
    },
  });
}
