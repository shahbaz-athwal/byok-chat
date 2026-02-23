import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const vProvider = v.union(
  v.literal("openai"),
  v.literal("google"),
  v.literal("anthropic")
);

export type Provider = "openai" | "google" | "anthropic";

export default defineSchema({
  apiKeys: defineTable({
    userId: v.string(),
    provider: vProvider,
    apiKey: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_provider", ["userId", "provider"]),

  chats: defineTable({
    userId: v.string(),
    threadId: v.string(),
    provider: vProvider,
    modelId: v.string(),
    title: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_threadId", ["threadId"]),
});
