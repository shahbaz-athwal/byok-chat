import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { SendIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { ChatModelSelector } from "@/components/chat/model-selector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER,
  type Provider,
} from "@/lib/chat-models";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = Route.useNavigate();
  const createThread = useMutation(api.threads.create);
  const sendMessage = useMutation(api.messages.send);

  const [provider, setProvider] = useState<Provider>(DEFAULT_PROVIDER);
  const [modelId, setModelId] = useState(
    DEFAULT_MODEL_BY_PROVIDER[DEFAULT_PROVIDER]
  );
  const [prompt, setPrompt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStartChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isCreating) {
      return;
    }

    setError(null);
    setIsCreating(true);
    try {
      const { chatId } = await createThread({ provider, modelId });
      await sendMessage({ chatId, prompt: trimmed });
      navigate({
        params: { chatId: chatId as Id<"chats"> },
        to: "/chat/$chatId",
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to start chat"
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl items-center px-4 py-6 sm:px-6">
      <form
        className="flex w-full flex-col gap-3 rounded-lg border p-4"
        onSubmit={handleStartChat}
      >
        <h1 className="font-semibold text-lg">Start a new chat</h1>
        <ChatModelSelector
          disabled={isCreating}
          modelId={modelId}
          onChange={(selection) => {
            setProvider(selection.provider);
            setModelId(selection.modelId);
          }}
          provider={provider}
        />
        <Textarea
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ask anything..."
          value={prompt}
        />
        <div className="flex justify-end">
          <Button
            disabled={isCreating || prompt.trim().length === 0}
            size="sm"
            type="submit"
          >
            <SendIcon />
            Start chat
          </Button>
        </div>
        {error ? <p className="text-destructive text-xs">{error}</p> : null}
      </form>
    </div>
  );
}
