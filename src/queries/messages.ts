import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

export const UI_MESSAGES_PAGE_SIZE = 50;

export function threadMessagesQuery(threadId: string) {
  return convexQuery(api.messages.list, {
    paginationOpts: {
      cursor: null,
      numItems: UI_MESSAGES_PAGE_SIZE,
    },
    streamArgs: {
      kind: "list",
    },
    threadId,
  });
}
