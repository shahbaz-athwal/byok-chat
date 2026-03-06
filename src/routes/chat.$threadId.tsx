import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChatThread } from "@/components/chat/chat-thread";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import type { ThreadSummary } from "@/lib/thread-data";
import { messagesListQuery, threadGetQuery } from "@/queries/threads";

export const Route = createFileRoute("/chat/$threadId")({
  loader: async ({ context, params }) => {
    const { threadId } = params;

    await Promise.all([
      context.queryClient.ensureQueryData(threadGetQuery(threadId)),
      context.queryClient.ensureQueryData(messagesListQuery(threadId)),
    ]);
  },
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  const { data: chatData } = useSuspenseQuery(threadGetQuery(threadId));
  const chat = (chatData as ThreadSummary | null | undefined) ?? null;

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
      modelId={chat.modelId}
      provider={chat.provider}
      threadId={threadId}
    />
  );
}
