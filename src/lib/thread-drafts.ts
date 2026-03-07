import type { OptimisticLocalStore } from "convex/browser";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import {
  getThreadMessagesQueryArgs,
  type ThreadMessagesQueryArgs,
} from "@/queries/messages";
import { api } from "../../convex/_generated/api";

export interface ThreadRecord
  extends FunctionReturnType<typeof api.threads.get> {}

export interface ThreadMessagesResult
  extends FunctionReturnType<typeof api.messages.list> {}

export interface ThreadListResult
  extends FunctionReturnType<typeof api.threads.list> {}

export interface ActivateDraftAndSendArgs
  extends FunctionArgs<typeof api.threads.activateDraftAndSend> {}

export interface OptimisticMessageArgs {
  order: number;
  prompt: string;
  threadId: string;
}

function createOptimisticThreadId(threadId: string) {
  return `optimistic-thread-${threadId}` as ThreadRecord["_id"];
}

function createOptimisticMessageId(threadId: string) {
  return `optimistic-message-${threadId}-${Date.now()}` as ThreadMessagesResult["page"][number]["id"];
}

function createEmptyMessagesResult(): ThreadMessagesResult {
  return {
    continueCursor: "",
    isDone: true,
    page: [],
    pageStatus: null,
    splitCursor: null,
    streams: {
      kind: "list",
      messages: [],
    },
  };
}

function createOptimisticUserMessage(args: OptimisticMessageArgs) {
  const messageId = createOptimisticMessageId(args.threadId);

  return {
    _creationTime: Date.now(),
    id: messageId,
    key: `${args.threadId}-${args.order}-0`,
    order: args.order,
    parts: [{ type: "text", text: args.prompt }],
    role: "user",
    status: "pending",
    stepOrder: 0,
    text: args.prompt,
  } satisfies ThreadMessagesResult["page"][number];
}

function upsertThreadInList(
  threads: ThreadListResult,
  nextThread: ThreadRecord
) {
  return [
    nextThread,
    ...threads.filter((thread) => thread.threadId !== nextThread.threadId),
  ];
}

function getNextMessageOrder(messages: ThreadMessagesResult["page"]) {
  return messages.reduce((highestOrder, message) => {
    return Math.max(highestOrder, message.order);
  }, -1);
}

function getThreadMessagesResult(
  localStore: OptimisticLocalStore,
  args: ThreadMessagesQueryArgs
) {
  return (
    localStore.getQuery(api.messages.list, args) ?? createEmptyMessagesResult()
  );
}

export function deriveThreadTitle(prompt: string) {
  const firstNonEmptyLine =
    prompt
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "Untitled chat";

  return firstNonEmptyLine.slice(0, 60);
}

export function applyActivateDraftOptimisticUpdate(
  localStore: OptimisticLocalStore,
  args: ActivateDraftAndSendArgs
) {
  const currentThread = localStore.getQuery(api.threads.get, {
    threadId: args.threadId,
  });
  const nextThread: ThreadRecord = {
    _creationTime: currentThread?._creationTime ?? Date.now(),
    _id: currentThread?._id ?? createOptimisticThreadId(args.threadId),
    modelId: args.modelId,
    provider: args.provider,
    status: "active",
    threadId: args.threadId,
    title: args.title,
    userId: currentThread?.userId ?? "",
  };
  localStore.setQuery(api.threads.get, { threadId: args.threadId }, nextThread);

  const currentThreads = localStore.getQuery(api.threads.list, {});
  localStore.setQuery(
    api.threads.list,
    {},
    upsertThreadInList(currentThreads ?? [], nextThread)
  );

  const messagesArgs = getThreadMessagesQueryArgs(args.threadId);
  const currentMessages = getThreadMessagesResult(localStore, messagesArgs);
  const optimisticMessage = createOptimisticUserMessage({
    order: getNextMessageOrder(currentMessages.page) + 1,
    prompt: args.prompt,
    threadId: args.threadId,
  });

  localStore.setQuery(api.messages.list, messagesArgs, {
    ...currentMessages,
    page: [...currentMessages.page, optimisticMessage],
    streams: currentMessages.streams ?? {
      kind: "list",
      messages: [],
    },
  });
}
