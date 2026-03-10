import {
  type ChatModelSelection,
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER,
} from "@shared/chat-models";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApiKeySettings } from "@/components/api-key-settings-provider";
import {
  ChatComposer,
  ChatComposerProvider,
  type ChatComposerSubmitPayload,
} from "@/components/chat/chat-composer";
import { useDraftThread } from "@/components/draft-thread-provider";
import { toastManager } from "@/components/ui/toast";
import { deriveThreadTitle } from "@/lib/thread-drafts";
import { useActivateDraftAndSendMutation } from "@/mutations/thread";

const COMMON_QUESTIONS = [
  "How does AI work?",
  "Are black holes real?",
  'How many Rs are in the word "strawberry"?',
  "What is the meaning of life?",
];

export const Route = createFileRoute("/")({
  component: HomePage,
});

export function HomePage() {
  const { configuredProviders, openSettings } = useApiKeySettings();
  const { consumeDraftThreadId, ensureDraftThreadId } = useDraftThread();
  const navigate = Route.useNavigate();
  const activateDraftAndSendMutation = useActivateDraftAndSendMutation();
  const [selectedProvider, setSelectedProvider] = useState(DEFAULT_PROVIDER);
  const [selectedModelId, setSelectedModelId] = useState(
    DEFAULT_MODEL_BY_PROVIDER[DEFAULT_PROVIDER]
  );
  const [isStartingChat, setIsStartingChat] = useState(false);
  const hasSelectedProviderKey = configuredProviders[selectedProvider];

  async function handleStartChat({
    prompt: message,
    provider,
    modelId,
  }: ChatComposerSubmitPayload) {
    if (!configuredProviders[provider]) {
      openSettings();
      return;
    }

    setIsStartingChat(true);

    try {
      const title = deriveThreadTitle(message);
      let threadId: string;

      try {
        threadId = await ensureDraftThreadId();
      } catch (error) {
        toastManager.add({
          description:
            error instanceof Error ? error.message : "Could not prepare chat",
          title: "Failed to prepare chat",
          type: "error",
        });
        throw error;
      }

      const startThreadPromise = activateDraftAndSendMutation.mutateAsync({
        modelId,
        prompt: message,
        provider,
        threadId,
        title,
      });

      navigate({
        params: { threadId },
        to: "/chat/$threadId",
      });

      await startThreadPromise;
      consumeDraftThreadId(threadId);
      return;
    } finally {
      setIsStartingChat(false);
    }
  }

  async function handleCommonQuestionSelect(prompt: string) {
    if (!hasSelectedProviderKey) {
      openSettings();
      return;
    }

    await handleStartChat({
      modelId: selectedModelId,
      prompt,
      provider: selectedProvider,
    });
  }

  function handleModelChange({ modelId, provider }: ChatModelSelection) {
    setSelectedModelId(modelId);
    setSelectedProvider(provider);
    return Promise.resolve();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-start justify-center">
          <div className="mb-6">
            <h1 className="font-medium text-foreground text-lg tracking-tight sm:text-xl">
              Welcome to BYOK Chat
            </h1>
            <p className="mt-1.5 text-muted-foreground text-xs">
              Ask anything, or start with one of these common questions.
            </p>
          </div>

          <ul className="w-full divide-y divide-border/60">
            {COMMON_QUESTIONS.map((question) => (
              <li key={question}>
                <button
                  className="w-full py-2.5 text-left text-foreground/80 text-sm transition-colors hover:bg-muted/30 hover:text-foreground sm:text-base"
                  disabled={isStartingChat}
                  onClick={async () => {
                    await handleCommonQuestionSelect(question);
                  }}
                  type="button"
                >
                  {question}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <ChatComposerProvider
        initialModelId={selectedModelId}
        initialProvider={selectedProvider}
        isSubmitting={isStartingChat}
        maxHeightPx={280}
        maxLength={16_000}
        onModelChange={handleModelChange}
        onSubmit={handleStartChat}
      >
        <ChatComposer />
      </ChatComposerProvider>
    </div>
  );
}
