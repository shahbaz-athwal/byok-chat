import { createThread } from "@convex-dev/agent";
import { ConvexError, v } from "convex/values";
import { getOneFromOrThrow } from "convex-helpers/server/relationships";
import {
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER,
  resolveRequestedModelOrThrow,
} from "../shared/chat-models";
import { components } from "./_generated/api";
import {
  type MutationCtx,
  mutation,
  type QueryCtx,
  query,
} from "./_generated/server";
import { queuePromptGeneration } from "./chat";
import { requireAuth } from "./lib/auth";
import { vProvider } from "./schema";

export async function getOwnedThreadContextOrThrow(
  ctx: QueryCtx | MutationCtx,
  threadId: string
) {
  const { userId } = await requireAuth(ctx);
  const thread = await getOneFromOrThrow(
    ctx.db,
    "threadConfig",
    "by_threadId",
    threadId
  );

  if (thread.userId !== userId) {
    throw new ConvexError("Thread not found");
  }

  return thread;
}

async function getDraftThreadForUser(
  ctx: QueryCtx | MutationCtx,
  userId: string
) {
  return await ctx.db
    .query("threadConfig")
    .withIndex("by_userId_status", (q) =>
      q.eq("userId", userId).eq("status", "draft")
    )
    .order("desc")
    .first();
}

export const ensureDraft = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    const existingDraft = await getDraftThreadForUser(ctx, userId);

    if (existingDraft) {
      return { threadId: existingDraft.threadId };
    }

    const threadId = await createThread(ctx, components.agent, { userId });

    await ctx.db.insert("threadConfig", {
      modelId: DEFAULT_MODEL_BY_PROVIDER[DEFAULT_PROVIDER],
      status: "draft",
      userId,
      threadId,
      provider: DEFAULT_PROVIDER,
    });

    return { threadId };
  },
});

export const activateDraftAndSend = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    provider: vProvider,
    modelId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, { threadId, prompt, provider, modelId, title }) => {
    const { userId } = await requireAuth(ctx);
    resolveRequestedModelOrThrow(provider, modelId);

    const thread = await getOwnedThreadContextOrThrow(ctx, threadId);
    if (thread.status !== "draft") {
      throw new ConvexError("Thread is already active");
    }

    await ctx.db.patch(thread._id, {
      modelId,
      provider,
      status: "active",
      title,
    });
    await Promise.all([
      ctx.runMutation(components.agent.threads.updateThread, {
        patch: { title },
        threadId,
      }),
      queuePromptGeneration(ctx, {
        modelId,
        prompt,
        provider,
        threadId,
        userId,
      }),
    ]);

    return { threadId };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    return await ctx.db
      .query("threadConfig")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "active")
      )
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
    modelId: v.string(),
  },
  handler: async (ctx, { threadId, provider, modelId }) => {
    resolveRequestedModelOrThrow(provider, modelId);

    const thread = await getOwnedThreadContextOrThrow(ctx, threadId);
    await ctx.db.patch(thread._id, { modelId, provider });
  },
});
