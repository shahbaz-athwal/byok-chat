import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChatThread } from "@/components/chat/chat-thread";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { threadGetQuery } from "@/queries/threads";

export const Route = createFileRoute("/chat/$threadId")({
  loader: async ({ context, params }) => {
    const { threadId } = params;

    await context.queryClient.ensureQueryData(threadGetQuery(threadId));
  },
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  const { data: chat } = useSuspenseQuery(threadGetQuery(threadId));

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
