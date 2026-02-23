"use node";

import { Agent } from "@convex-dev/agent";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { resolveModel } from "./lib/models";

export const generate = internalAction({
  args: {
    chatId: v.id("chats"),
    promptMessageId: v.string(),
  },
  handler: async (ctx, { chatId, promptMessageId }) => {
    const chat = await ctx.runQuery(internal.threads.getInternal, { chatId });

    const apiKey = await ctx.runQuery(internal.apiKeys.getKey, {
      userId: chat.userId,
      provider: chat.provider,
    });

    const model = resolveModel(chat.provider, chat.modelId, apiKey);

    const agent = new Agent(components.agent, {
      name: "byok-chat",
      languageModel: model,
      instructions: "You are a helpful assistant.",
    });

    const { thread } = await agent.continueThread(ctx, {
      threadId: chat.threadId,
      userId: chat.userId,
    });

    await thread.streamText({ promptMessageId }, { saveStreamDeltas: true });
  },
});
