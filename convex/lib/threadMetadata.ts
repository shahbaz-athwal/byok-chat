import { components, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import type { Provider } from "../schema";
import { requireAuth } from "./auth";

interface AgentThreadMetadata {
  _creationTime: number;
  _id: string;
  status: "active" | "archived";
  summary?: string;
  title?: string;
  userId?: string;
}

interface ThreadContext {
  config: Doc<"chats">;
  thread: AgentThreadMetadata;
}

interface OwnedThreadContext extends ThreadContext {
  userId: string;
}

interface ThreadSummary {
  _creationTime: number;
  modelId: string;
  provider: Provider;
  threadId: string;
  title?: string;
}

type ThreadMetadataContext = QueryCtx | MutationCtx | ActionCtx;

export function getThreadTitle(prompt: string): string | undefined {
  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed.slice(0, 80);
}

export function toThreadSummary({
  config,
  thread,
}: ThreadContext): ThreadSummary {
  return {
    _creationTime: thread._creationTime,
    modelId: config.modelId,
    provider: config.provider,
    threadId: thread._id,
    title: thread.title,
  };
}

async function getThreadConfig(
  ctx: ThreadMetadataContext,
  threadId: string
): Promise<Doc<"chats"> | null> {
  if ("db" in ctx) {
    return await ctx.db
      .query("chats")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .unique();
  }

  return await ctx.runQuery(internal.threads.getConfigInternal, { threadId });
}

export async function getThreadContext(
  ctx: ThreadMetadataContext,
  threadId: string
): Promise<ThreadContext | null> {
  const [config, thread] = await Promise.all([
    getThreadConfig(ctx, threadId),
    ctx.runQuery(components.agent.threads.getThread, { threadId }),
  ]);

  if (!(config && thread)) {
    return null;
  }

  return {
    config,
    thread: {
      _creationTime: thread._creationTime,
      _id: thread._id,
      status: thread.status,
      summary: thread.summary,
      title: thread.title,
      userId: thread.userId,
    },
  } satisfies ThreadContext;
}

export async function getOwnedThreadContextOrNull(
  ctx: QueryCtx | MutationCtx,
  threadId: string
): Promise<OwnedThreadContext | null> {
  const { userId } = await requireAuth(ctx);
  const threadContext = await getThreadContext(ctx, threadId);

  if (!threadContext || threadContext.thread.userId !== userId) {
    return null;
  }

  return {
    ...threadContext,
    userId,
  } satisfies OwnedThreadContext;
}

export async function requireOwnedThreadContext(
  ctx: QueryCtx | MutationCtx,
  threadId: string
): Promise<OwnedThreadContext> {
  const threadContext = await getOwnedThreadContextOrNull(ctx, threadId);
  if (!threadContext) {
    throw new Error("Chat not found");
  }

  return threadContext;
}
