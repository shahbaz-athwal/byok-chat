import {
  listUIMessages,
  saveMessage,
  syncStreams,
  vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { requireOwnedThreadContext } from "./lib/threadMetadata";

export const list = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    await requireOwnedThreadContext(ctx, args.threadId);

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

export const send = mutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  handler: async (ctx, { threadId, prompt }) => {
    const threadContext = await requireOwnedThreadContext(ctx, threadId);

    const { messageId } = await saveMessage(ctx, components.agent, {
      prompt,
      threadId,
      userId: threadContext.userId,
    });

    await ctx.scheduler.runAfter(0, internal.chat.generate, {
      promptMessageId: messageId,
      threadId,
    });

    return messageId;
  },
});
