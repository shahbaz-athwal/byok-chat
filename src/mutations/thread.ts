import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import type { FunctionArgs } from "convex/server";
import { toastManager } from "@/components/ui/toast";
import { DEFAULT_MODEL_BY_PROVIDER, type Provider } from "@/lib/chat-models";
import type { ThreadListResult } from "@/lib/thread-data";
import { api } from "../../convex/_generated/api";

interface StartThreadMutationInput {
  modelId: FunctionArgs<typeof api.threads.createWithFirstMessage>["modelId"];
  prompt: FunctionArgs<typeof api.threads.createWithFirstMessage>["prompt"];
  provider: FunctionArgs<typeof api.threads.createWithFirstMessage>["provider"];
}

const THREADS_LIST_ARGS: FunctionArgs<typeof api.threads.list> = {
  paginationOpts: { cursor: null, numItems: 50 },
};

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
  const startThread = useConvexMutation(
    api.threads.createWithFirstMessage
  ).withOptimisticUpdate((localStore, args) => {
    const currentThreads = localStore.getQuery(
      api.threads.list,
      THREADS_LIST_ARGS
    ) as ThreadListResult | undefined;
    if (currentThreads === undefined) {
      return;
    }

    const optimisticProvider = args.provider as Provider;
    const optimisticModelId =
      args.modelId ?? DEFAULT_MODEL_BY_PROVIDER[optimisticProvider];
    const optimisticTitle = args.prompt.trim();
    const optimisticThread = {
      _creationTime: Date.now(),
      modelId: optimisticModelId,
      provider: optimisticProvider,
      threadId: crypto.randomUUID(),
      title:
        optimisticTitle.length > 0 ? optimisticTitle.slice(0, 80) : undefined,
    };

    localStore.setQuery(api.threads.list, THREADS_LIST_ARGS, {
      ...currentThreads,
      page: [optimisticThread, ...currentThreads.page].slice(
        0,
        THREADS_LIST_ARGS.paginationOpts.numItems
      ),
    });
  });

  return useMutation({
    mutationFn: ({ provider, modelId, prompt }: StartThreadMutationInput) =>
      startThread({ modelId, prompt, provider }),
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
