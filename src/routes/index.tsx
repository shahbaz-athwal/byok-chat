import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApiKeySettings } from "@/components/api-key-settings-provider";
import {
  ChatComposer,
  ChatComposerProvider,
  type ChatComposerSubmitPayload,
} from "@/components/chat/chat-composer";
import { Button } from "@/components/ui/button";
import {
  type ChatModelSelection,
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER,
  PROVIDER_LABELS,
} from "@/lib/chat-models";
import { useStartThreadMutation } from "@/mutations/thread";

const COMMON_QUESTIONS = [
  "How does AI work?",
  "Are black holes real?",
  'How many Rs are in the word "strawberry"?',
  "What is the meaning of life?",
];

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { configuredProviders, openSettings } = useApiKeySettings();
  const navigate = Route.useNavigate();
  const startThreadMutation = useStartThreadMutation();
  const [selectedProvider, setSelectedProvider] = useState(DEFAULT_PROVIDER);
  const [selectedModelId, setSelectedModelId] = useState(
    DEFAULT_MODEL_BY_PROVIDER[DEFAULT_PROVIDER]
  );
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

    const { threadId } = await startThreadMutation.mutateAsync({
      modelId,
      prompt: message,
      provider,
    });
    navigate({
      params: { threadId },
      to: "/chat/$threadId",
    });
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
          {hasSelectedProviderKey ? null : (
            <div className="mb-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/35 px-4 py-3">
              <p className="text-muted-foreground text-sm">
                Add your {PROVIDER_LABELS[selectedProvider]} API key before you
                start a new chat.
              </p>
              <Button onClick={openSettings} size="sm" variant="outline">
                Open settings
              </Button>
            </div>
          )}
          <ul className="w-full divide-y divide-border/60">
            {COMMON_QUESTIONS.map((question) => (
              <li key={question}>
                <button
                  className="w-full py-2.5 text-left text-foreground/80 text-sm transition-colors hover:bg-muted/30 hover:text-foreground sm:text-base"
                  disabled={startThreadMutation.isPending}
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
        isSubmitting={startThreadMutation.isPending}
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
