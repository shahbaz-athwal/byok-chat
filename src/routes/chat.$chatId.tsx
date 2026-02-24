import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ChatThread } from "@/components/chat/chat-thread";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/chat/$chatId")({
  component: ChatPage,
});

function ChatPage() {
  const { chatId: rawChatId } = Route.useParams();
  const chatId = rawChatId as Id<"chats">;
  const chat = useQuery(api.threads.get, { chatId });

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
