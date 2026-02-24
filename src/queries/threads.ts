import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function threadsListQuery() {
  return convexQuery(api.threads.list, {
    paginationOpts: { cursor: null, numItems: 50 },
  });
}

export function threadGetQuery(chatId: Id<"chats">) {
  return convexQuery(api.threads.get, { chatId });
}

export function messagesListQuery(chatId: Id<"chats">) {
  return convexQuery(api.messages.list, {
    chatId,
    paginationOpts: { cursor: null, numItems: 20 },
  });
}
