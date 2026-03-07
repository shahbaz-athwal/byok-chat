import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

export const UI_MESSAGES_PAGE_SIZE = 50;

export interface ThreadMessagesQueryArgs {
  paginationOpts: {
    cursor: null;
    numItems: number;
  };
  streamArgs: {
    kind: "list";
  };
  threadId: string;
}

export function getThreadMessagesQueryArgs(
  threadId: string
): ThreadMessagesQueryArgs {
  return {
    paginationOpts: {
      cursor: null,
      numItems: UI_MESSAGES_PAGE_SIZE,
    },
    streamArgs: {
      kind: "list",
    },
    threadId,
  };
}

export function threadMessagesQuery(threadId: string) {
  return convexQuery(api.messages.list, getThreadMessagesQueryArgs(threadId));
}
