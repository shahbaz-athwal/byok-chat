import { createThread } from "@convex-dev/agent";
import { v } from "convex/values";
import { getOneFromOrThrow } from "convex-helpers/server/relationships";
import { resolveRequestedModelOrThrow } from "../shared/chat-models";
import { components } from "./_generated/api";
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { vProvider } from "./schema";

export async function getOwnedThreadContextOrThrow(
  ctx: QueryCtx | MutationCtx,
  threadId: string
) {
  await requireAuth(ctx);
  return getOneFromOrThrow(ctx.db, "threadConfig", "by_threadId", threadId);
}
export const start = mutation({
  args: {
    prompt: v.string(),
    provider: vProvider,
    modelSlug: v.string(),
  },
  handler: async (ctx, { provider, modelSlug }) => {
    const { userId } = await requireAuth(ctx);
    resolveRequestedModelOrThrow(provider, modelSlug);

    const threadId = await createThread(ctx, components.agent, { userId });

    await ctx.db.insert("threadConfig", {
      status: "active",
      userId,
      threadId,
      provider,
      modelSlug,
    });

    // kick off generation
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db
      .query("threadConfig")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, { threadId }) => {
    return await getOwnedThreadContextOrThrow(ctx, threadId);
  },
});

export const remove = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, { threadId }) => {
    const thread = await getOwnedThreadContextOrThrow(ctx, threadId);
    await ctx.db.delete(thread._id);
    await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, {
      threadId,
    });
  },
});

export const updateTitle = mutation({
  args: {
    threadId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { threadId, title }) => {
    const thread = await getOwnedThreadContextOrThrow(ctx, threadId);
    await ctx.db.patch(thread._id, { title });
    await ctx.runMutation(components.agent.threads.updateThread, {
      patch: { title },
      threadId,
    });
  },
});

export const updateModel = mutation({
  args: {
    threadId: v.string(),
    provider: vProvider,
    modelSlug: v.string(),
  },
  handler: async (ctx, { threadId, provider, modelSlug }) => {
    resolveRequestedModelOrThrow(provider, modelSlug);

    const thread = await getOwnedThreadContextOrThrow(ctx, threadId);
    await ctx.db.patch(thread._id, { modelSlug, provider });
  },
});
