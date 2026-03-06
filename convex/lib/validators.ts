import { paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { vProvider } from "../schema";

export const vThreadSummary = v.object({
  _creationTime: v.number(),
  modelId: v.string(),
  provider: vProvider,
  threadId: v.string(),
  title: v.optional(v.string()),
});

export const vApiKeyListEntry = v.object({
  maskedKey: v.string(),
  models: v.array(v.string()),
  provider: vProvider,
});

export const vPaginatedThreadSummary =
  paginationResultValidator(vThreadSummary);
