import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

export function threadsListQuery() {
  return convexQuery(api.threads.list, {
    paginationOpts: { cursor: null, numItems: 50 },
  });
}

export function threadGetQuery(threadId: string) {
  return convexQuery(api.threads.get, { threadId });
}

export function messagesListQuery(threadId: string) {
  return convexQuery(api.messages.list, {
    threadId,
    paginationOpts: { cursor: null, numItems: 20 },
  });
}
