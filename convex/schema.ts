import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { literals, typedV } from "convex-helpers/validators";
import { PROVIDERS } from "../shared/chat-models";

export const vProvider = literals(...PROVIDERS);

export const schema = defineSchema({
  apiKeys: defineTable({
    userId: v.string(),
    provider: vProvider,
    apiKey: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_provider", ["userId", "provider"]),

  threadConfig: defineTable({
    title: v.optional(v.string()),
    userId: v.string(),
    status: literals("active", "archived"),
    threadId: v.string(),
    provider: vProvider,
    modelSlug: v.string(),
  })
    .index("by_threadId", ["threadId"])
    .index("by_userId", ["userId"]),
});

export const vv = typedV(schema);

export default schema;
