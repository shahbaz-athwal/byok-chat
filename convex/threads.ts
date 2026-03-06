import { createThread, saveMessage } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { DEFAULT_MODELS, SUPPORTED_MODELS } from "./lib/models";
import {
  getOwnedThreadContextOrNull,
  getThreadTitle,
  toThreadSummary,
} from "./lib/threadMetadata";
import { vProvider } from "./schema";

function isPresent<Value>(value: Value | null): value is Value {
  return value !== null;
}

export const getConfigInternal = internalQuery({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, { threadId }) => {
    return await ctx.db
      .query("chats")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .unique();
  },
});

export const create = mutation({
  args: {
    provider: vProvider,
    modelId: v.optional(v.string()),
  },
  handler: async (ctx, { provider, modelId }) => {
    const { userId } = await requireAuth(ctx);

    const resolvedModelId = modelId ?? DEFAULT_MODELS[provider];
    if (!SUPPORTED_MODELS[provider].includes(resolvedModelId)) {
      throw new Error(
        `Unsupported model "${resolvedModelId}" for provider "${provider}"`
      );
    }

    const threadId = await createThread(ctx, components.agent, { userId });

    await ctx.db.insert("chats", {
      threadId,
      provider,
      modelId: resolvedModelId,
    });

    return { threadId };
  },
});

export const createWithFirstMessage = mutation({
  args: {
    provider: vProvider,
    modelId: v.optional(v.string()),
    prompt: v.string(),
  },
  handler: async (ctx, { provider, modelId, prompt }) => {
    const { userId } = await requireAuth(ctx);

    const resolvedModelId = modelId ?? DEFAULT_MODELS[provider];
    if (!SUPPORTED_MODELS[provider].includes(resolvedModelId)) {
      throw new Error(
        `Unsupported model "${resolvedModelId}" for provider "${provider}"`
      );
    }

    const threadId = await createThread(ctx, components.agent, {
      title: getThreadTitle(prompt),
      userId,
    });

    await ctx.db.insert("chats", {
      threadId,
      provider,
      modelId: resolvedModelId,
    });

    const { messageId } = await saveMessage(ctx, components.agent, {
      prompt,
      threadId,
      userId,
    });

    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider)
      )
      .unique();

    if (!apiKey) {
      throw new Error(
        `No API key configured for provider "${provider}". Please add your API key in settings.`
      );
    }

    await ctx.scheduler.runAfter(0, internal.chat.generate, {
      promptMessageId: messageId,
      threadId,
      apiKey: apiKey.apiKey,
    });

    return { messageId, threadId };
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { paginationOpts }) => {
    const { userId } = await requireAuth(ctx);
    const threads = await ctx.runQuery(
      components.agent.threads.listThreadsByUserId,
      {
        order: "desc",
        paginationOpts,
        userId,
      }
    );

    const page = await Promise.all(
      threads.page.map(async (thread) => {
        const config = await ctx.db
          .query("chats")
          .withIndex("by_threadId", (q) => q.eq("threadId", thread._id))
          .unique();

        if (!config) {
          return null;
        }

        return toThreadSummary({
          config,
          thread: {
            _creationTime: thread._creationTime,
            _id: thread._id,
            status: thread.status,
            summary: thread.summary,
            title: thread.title,
            userId: thread.userId,
          },
        });
      })
    );

    return {
      ...threads,
      page: page.filter(isPresent),
    };
  },
});

export const get = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, { threadId }) => {
    const threadContext = await getOwnedThreadContextOrNull(ctx, threadId);
    if (!threadContext) {
      return null;
    }

    return toThreadSummary(threadContext);
  },
});

export const remove = mutation({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, { threadId }) => {
    const threadContext = await getOwnedThreadContextOrNull(ctx, threadId);
    if (!threadContext) {
      throw new Error("Chat not found");
    }

    await ctx.db.delete(threadContext.config._id);
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
    const threadContext = await getOwnedThreadContextOrNull(ctx, threadId);
    if (!threadContext) {
      throw new Error("Chat not found");
    }

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
    if (!SUPPORTED_MODELS[provider].includes(modelId)) {
      throw new Error(
        `Unsupported model "${modelId}" for provider "${provider}"`
      );
    }

    const threadContext = await getOwnedThreadContextOrNull(ctx, threadId);
    if (!threadContext) {
      throw new Error("Chat not found");
    }

    await ctx.db.patch(threadContext.config._id, { modelId, provider });
  },
});
