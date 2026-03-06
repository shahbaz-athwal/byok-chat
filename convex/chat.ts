import { Agent } from "@convex-dev/agent";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { getOwnedThreadContextOrThrow } from "./threads";

export const generate = internalAction({
  args: {
    promptMessageId: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, { threadId, promptMessageId }) => {
    const thread = await getOwnedThreadContextOrThrow(ctx, threadId);

    const agent = new Agent(components.agent, {
      name: "byok-chat",
      languageModel: model,
      instructions: "You are a helpful assistant.",
    });

    const { thread } = await agent.continueThread(ctx, {
      threadId,
    });

    await thread.streamText({ promptMessageId }, { saveStreamDeltas: true });
  },
});
