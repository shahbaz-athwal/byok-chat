import { listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { queuePromptGeneration } from "./chat";
import { getOwnedThreadContextOrThrow } from "./threads";

export const send = mutation({
  args: {
    prompt: v.string(),
    threadId: v.string(),
  },
  handler: async (ctx, { threadId, prompt }) => {
    const thread = await getOwnedThreadContextOrThrow(ctx, threadId);
    if (thread.status === "draft") {
      throw new ConvexError("Draft threads must be activated before sending");
    }

    await queuePromptGeneration(ctx, {
      modelId: thread.modelId,
      prompt,
      provider: thread.provider,
      threadId,
      userId: thread.userId,
    });
  },
});

export const list = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    await getOwnedThreadContextOrThrow(ctx, args.threadId);

    const paginated = await listUIMessages(ctx, components.agent, {
      threadId: args.threadId,
      paginationOpts: args.paginationOpts,
    });
    const streams = await syncStreams(ctx, components.agent, {
      threadId: args.threadId,
      streamArgs: args.streamArgs,
    });

    return { ...paginated, streams };
  },
});
