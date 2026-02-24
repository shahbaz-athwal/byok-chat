import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChatThread } from "@/components/chat/chat-thread";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { messagesListQuery, threadGetQuery } from "@/queries/threads";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/chat/$chatId")({
  loader: async ({ context, params }) => {
    const chatId = params.chatId as Id<"chats">;

    await Promise.all([
      context.queryClient.ensureQueryData(threadGetQuery(chatId)),
      context.queryClient.ensureQueryData(messagesListQuery(chatId)),
    ]);
  },
  component: ChatPage,
});

function ChatPage() {
  const { chatId: rawChatId } = Route.useParams();
  const chatId = rawChatId as Id<"chats">;
  const { data: chat } = useSuspenseQuery(threadGetQuery(chatId));

  if (chat === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading chat...</p>
      </div>
    );
  }

  if (!chat) {
    return (
      <Empty className="h-full justify-center">
        <EmptyHeader>
          <EmptyTitle>Chat not found</EmptyTitle>
          <EmptyDescription>
            This chat might have been deleted or you no longer have access.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ChatThread
      chatId={chatId}
      modelId={chat.modelId}
      provider={chat.provider}
    />
  );
}
