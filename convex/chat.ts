import { Agent } from "@convex-dev/agent";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { resolveModel } from "./lib/models";
import { getThreadContext } from "./lib/threadMetadata";

export const generate = internalAction({
  args: {
    promptMessageId: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, { threadId, promptMessageId }) => {
    const threadContext = await getThreadContext(ctx, threadId);
    if (!threadContext?.thread.userId) {
      throw new Error("Chat not found");
    }

    const apiKey = await ctx.runQuery(internal.apiKeys.getKey, {
      userId: threadContext.thread.userId,
      provider: threadContext.config.provider,
    });

    const model = resolveModel(
      threadContext.config.provider,
      threadContext.config.modelId,
      apiKey
    );

    const agent = new Agent(components.agent, {
      name: "byok-chat",
      languageModel: model,
      instructions: "You are a helpful assistant.",
    });

    const { thread } = await agent.continueThread(ctx, {
      threadId,
      userId: threadContext.thread.userId,
    });

    await thread.streamText({ promptMessageId }, { saveStreamDeltas: true });
  },
});
