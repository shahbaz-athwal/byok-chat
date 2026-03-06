import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../convex/_generated/api";

export function useStartThreadMutation() {
  // TODO: Implement
}

export function useSendThreadMessageMutation() {
  return useMutation({
    mutationFn: useConvexMutation(api.messages.send),
    onError: (_error) => {
      // TODO: Handle error
    },
  });
}

export function useUpdateThreadModelMutation() {
  return useMutation({
    mutationFn: useConvexMutation(api.threads.updateModel),
    onError: (_error) => {
      // TODO: Handle error
    },
  });
}

export function useRemoveThreadMutation() {
  return useMutation({
    mutationFn: useConvexMutation(api.threads.remove),
    onError: (_error) => {
      // TODO: Handle error
    },
  });
}
