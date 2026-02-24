"use client";

import { SendIcon } from "lucide-react";
import {
  createContext,
  type FormEvent,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import type { Provider } from "@/lib/chat-models";
import { cn } from "@/lib/utils";
import { ChatModelSelector } from "./model-selector";

interface ChatComposerModelSelection {
  modelId: string;
  provider: Provider;
}

export interface ChatComposerSubmitPayload {
  modelId: string;
  prompt: string;
  provider: Provider;
}

interface ChatComposerProviderProps {
  children: ReactNode;
  disabled?: boolean;
  initialModelId: string;
  initialProvider: Provider;
  isAssistantStreaming?: boolean;
  isModelUpdating?: boolean;
  isSubmitting?: boolean;
  maxHeightPx?: number;
  maxLength?: number;
  onModelChange?: (selection: ChatComposerModelSelection) => Promise<void>;
  onSubmit: (payload: ChatComposerSubmitPayload) => Promise<void>;
  placeholder?: string;
  submitAriaLabel?: string;
}

interface ChatComposerContextValue {
  disabled: boolean;
  handleModelChange: (selection: ChatComposerModelSelection) => Promise<void>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isModelUpdating: boolean;
  isSubmitBlocked: boolean;
  maxHeightPx: number;
  maxLength: number;
  placeholder: string;
  prompt: string;
  selectedModelId: string;
  selectedProvider: Provider;
  setPrompt: (value: string) => void;
  submitAriaLabel: string;
}

const ChatComposerContext = createContext<ChatComposerContextValue | null>(
  null
);

function useChatComposerContext() {
  const context = useContext(ChatComposerContext);
  if (!context) {
    throw new Error(
      "useChatComposerContext must be used within ChatComposerProvider."
    );
  }

  return context;
}

export function ChatComposerProvider({
  children,
  initialProvider,
  initialModelId,
  onSubmit,
  onModelChange,
  disabled = false,
  isSubmitting = false,
  isAssistantStreaming = false,
  isModelUpdating = false,
  placeholder = "Type your message here...",
  submitAriaLabel = "Send",
  maxLength = 16_000,
  maxHeightPx = 280,
}: ChatComposerProviderProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedProvider, setSelectedProvider] =
    useState<Provider>(initialProvider);
  const [selectedModelId, setSelectedModelId] = useState(initialModelId);

  useEffect(() => {
    setSelectedProvider(initialProvider);
    setSelectedModelId(initialModelId);
  }, [initialProvider, initialModelId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (
      !trimmed ||
      disabled ||
      isSubmitting ||
      isAssistantStreaming ||
      isModelUpdating
    ) {
      return;
    }

    try {
      await onSubmit({
        modelId: selectedModelId,
        prompt: trimmed,
        provider: selectedProvider,
      });
      setPrompt("");
    } catch {
      // Keep the prompt in place when submission fails.
    }
  }

  async function handleModelChange(selection: ChatComposerModelSelection) {
    if (disabled || isModelUpdating) {
      return;
    }

    const unchanged =
      selection.provider === selectedProvider &&
      selection.modelId === selectedModelId;

    if (unchanged) {
      return;
    }

    const previousProvider = selectedProvider;
    const previousModelId = selectedModelId;

    setSelectedProvider(selection.provider);
    setSelectedModelId(selection.modelId);

    if (onModelChange) {
      try {
        await onModelChange(selection);
      } catch (error) {
        setSelectedProvider(previousProvider);
        setSelectedModelId(previousModelId);
        throw error;
      }
    }
  }

  const isSubmitBlocked =
    disabled ||
    isSubmitting ||
    isAssistantStreaming ||
    isModelUpdating ||
    prompt.trim().length === 0;

  return (
    <ChatComposerContext.Provider
      value={{
        disabled,
        handleModelChange,
        handleSubmit,
        isModelUpdating,
        isSubmitBlocked,
        maxHeightPx,
        maxLength,
        placeholder,
        prompt,
        selectedModelId,
        selectedProvider,
        setPrompt,
        submitAriaLabel,
      }}
    >
      {children}
    </ChatComposerContext.Provider>
  );
}

export function ChatComposer({ className }: { className?: string }) {
  const {
    prompt,
    setPrompt,
    selectedProvider,
    selectedModelId,
    handleModelChange,
    handleSubmit,
    disabled,
    isSubmitBlocked,
    placeholder,
    submitAriaLabel,
    maxLength,
    maxHeightPx,
    isModelUpdating,
  } = useChatComposerContext();

  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 bg-transparent px-0 pt-3 pb-0 sm:px-0",
        className
      )}
    >
      <form
        className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 sm:px-6"
        onSubmit={handleSubmit}
      >
        <div className="rounded-t-3xl rounded-b-none border border-border/50 bg-background/45 p-2 shadow-sm backdrop-blur-xl supports-backdrop-filter:bg-background/25">
          <textarea
            className="min-h-20 w-full resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            disabled={disabled || isModelUpdating}
            maxLength={maxLength}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={placeholder}
            style={{ maxHeight: `${maxHeightPx}px` }}
            value={prompt}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <ChatModelSelector
              disabled={disabled || isModelUpdating}
              modelId={selectedModelId}
              onChange={handleModelChange}
              provider={selectedProvider}
              triggerClassName="h-8 w-auto min-w-0 rounded-full border-border/60 bg-background/70 px-3 text-xs sm:w-auto"
            />
            <Button
              aria-label={submitAriaLabel}
              className="rounded-full"
              disabled={isSubmitBlocked}
              size="icon"
              type="submit"
            >
              <SendIcon />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
