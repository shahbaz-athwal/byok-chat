import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { SUPPORTED_MODELS } from "./lib/models";
import { vProvider } from "./schema";

function maskKey(key: string): string {
  if (key.length <= 8) {
    return "••••••••";
  }
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export const save = mutation({
  args: {
    provider: vProvider,
    apiKey: v.string(),
  },
  handler: async (ctx, { provider, apiKey }) => {
    const { userId } = await requireAuth(ctx);

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { apiKey });
      return existing._id;
    }

    return await ctx.db.insert("apiKeys", { userId, provider, apiKey });
  },
});

export const remove = mutation({
  args: {
    provider: vProvider,
  },
  handler: async (ctx, { provider }) => {
    const { userId } = await requireAuth(ctx);

    const existing = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return keys.map((key) => ({
      provider: key.provider,
      maskedKey: maskKey(key.apiKey),
      models: SUPPORTED_MODELS[key.provider],
    }));
  },
});

export const getKey = internalQuery({
  args: {
    userId: v.string(),
    provider: vProvider,
  },
  handler: async (ctx, { userId, provider }) => {
    const doc = await ctx.db
      .query("apiKeys")
      .withIndex("by_userId_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider)
      )
      .unique();

    if (!doc) {
      throw new Error(
        `No API key configured for provider "${provider}". Please add your API key in settings.`
      );
    }

    return doc.apiKey;
  },
});
