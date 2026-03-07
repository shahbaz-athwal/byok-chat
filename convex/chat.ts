import { Agent, saveMessage } from "@convex-dev/agent";
import { v } from "convex/values";
import type { Provider } from "../shared/chat-models";
import { components, internal } from "./_generated/api";
import { internalAction, type MutationCtx } from "./_generated/server";
import { resolveModel } from "./lib/models";
import { vProvider } from "./schema";

interface QueuePromptGenerationArgs {
  modelId: string;
  prompt: string;
  provider: Provider;
  threadId: string;
  userId: string;
}

export async function queuePromptGeneration(
  ctx: MutationCtx,
  { modelId, prompt, provider, threadId, userId }: QueuePromptGenerationArgs
) {
  const { messageId } = await saveMessage(ctx, components.agent, {
    prompt,
    threadId,
    userId,
  });

  await ctx.scheduler.runAfter(0, internal.chat.generate, {
    modelId,
    promptMessageId: messageId,
    provider,
    threadId,
    userId,
  });

  return { promptMessageId: messageId };
}

export const generate = internalAction({
  args: {
    modelId: v.string(),
    promptMessageId: v.string(),
    provider: vProvider,
    threadId: v.string(),
    userId: v.string(),
  },
  handler: async (
    ctx,
    { threadId, promptMessageId, provider, modelId, userId }
  ) => {
    const apiKey = await ctx.runQuery(internal.apiKeys.getKey, {
      provider,
      userId,
    });

    const agent = new Agent(components.agent, {
      name: "byok-chat",
      languageModel: resolveModel(provider, modelId, apiKey),
      instructions: "You are a helpful assistant.",
    });
    const { thread } = await agent.continueThread(ctx, {
      threadId,
      userId,
    });

    await thread.streamText({ promptMessageId }, { saveStreamDeltas: true });
  },
});
