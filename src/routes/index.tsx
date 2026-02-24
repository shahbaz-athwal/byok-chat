import { createFileRoute } from "@tanstack/react-router";
import {
  ChatComposer,
  ChatComposerProvider,
  type ChatComposerSubmitPayload,
} from "@/components/chat/chat-composer";
import { DEFAULT_MODEL_BY_PROVIDER, DEFAULT_PROVIDER } from "@/lib/chat-models";
import { useStartThreadMutation } from "@/mutations/thread";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = Route.useNavigate();
  const startThreadMutation = useStartThreadMutation();

  async function handleStartChat({
    prompt: message,
    provider,
    modelId,
  }: ChatComposerSubmitPayload) {
    // TODO: make this optimistic update and navigate to the chat page
    const { chatId } = await startThreadMutation.mutateAsync({
      modelId,
      prompt: message,
      provider,
    });
    navigate({
      params: { chatId: chatId as Id<"chats"> },
      to: "/chat/$chatId",
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* TODO: add a welcome message and common questions  to start a chat*/}
      <div className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-center">
          <h1 className="text-muted-foreground text-sm">Start a new chat</h1>
        </div>
      </div>
      <ChatComposerProvider
        initialModelId={DEFAULT_MODEL_BY_PROVIDER[DEFAULT_PROVIDER]}
        initialProvider={DEFAULT_PROVIDER}
        isSubmitting={startThreadMutation.isPending}
        maxHeightPx={280}
        maxLength={16_000}
        onSubmit={handleStartChat}
      >
        <ChatComposer />
      </ChatComposerProvider>
    </div>
  );
}
