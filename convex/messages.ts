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
import { requireAuth } from "./lib/auth";

export const list = query({
  args: {
    chatId: v.id("chats"),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }

    const paginated = await listUIMessages(ctx, components.agent, {
      threadId: chat.threadId,
      paginationOpts: args.paginationOpts,
    });
    const streams = await syncStreams(ctx, components.agent, {
      threadId: chat.threadId,
      streamArgs: args.streamArgs,
    });

    return { ...paginated, streams };
  },
});

export const send = mutation({
  args: {
    chatId: v.id("chats"),
    prompt: v.string(),
  },
  handler: async (ctx, { chatId, prompt }) => {
    const { userId } = await requireAuth(ctx);

    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found");
    }

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId: chat.threadId,
      prompt,
    });

    await ctx.scheduler.runAfter(0, internal.chat.generate, {
      chatId,
      promptMessageId: messageId,
    });

    return messageId;
  },
});
