import { createThread } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { DEFAULT_MODELS, SUPPORTED_MODELS } from "./lib/models";
import { vProvider } from "./schema";

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

    const chatId = await ctx.db.insert("chats", {
      userId,
      threadId,
      provider,
      modelId: resolvedModelId,
    });

    return { chatId, threadId };
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { paginationOpts }) => {
    const { userId } = await requireAuth(ctx);

    return await ctx.db
      .query("chats")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const get = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, { chatId }) => {
    const { userId } = await requireAuth(ctx);

    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) {
      return null;
    }

    return chat;
  },
});

export const getInternal = internalQuery({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, { chatId }) => {
    const chat = await ctx.db.get(chatId);
    if (!chat) {
      throw new Error("Chat not found");
    }
    return chat;
  },
});

export const remove = mutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, { chatId }) => {
    const { userId } = await requireAuth(ctx);

    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }

    await ctx.db.delete(chatId);
  },
});

export const updateTitle = mutation({
  args: {
    chatId: v.id("chats"),
    title: v.string(),
  },
  handler: async (ctx, { chatId, title }) => {
    const { userId } = await requireAuth(ctx);

    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }

    await ctx.db.patch(chatId, { title });
  },
});

export const updateModel = mutation({
  args: {
    chatId: v.id("chats"),
    provider: vProvider,
    modelId: v.string(),
  },
  handler: async (ctx, { chatId, provider, modelId }) => {
    const { userId } = await requireAuth(ctx);

    if (!SUPPORTED_MODELS[provider].includes(modelId)) {
      throw new Error(
        `Unsupported model "${modelId}" for provider "${provider}"`
      );
    }

    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }

    await ctx.db.patch(chatId, { provider, modelId });
  },
});
