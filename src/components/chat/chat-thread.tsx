"use client";

import type { UIMessage } from "@convex-dev/agent";
import { useUIMessages } from "@convex-dev/agent/react";
import { useEffect, useRef, useState } from "react";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import type { Provider } from "@/lib/chat-models";
import {
  useSendThreadMessageMutation,
  useUpdateThreadModelMutation,
} from "@/mutations/thread";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  ChatComposer,
  ChatComposerProvider,
  type ChatComposerSubmitPayload,
} from "./chat-composer";

interface ChatThreadProps {
  chatId: Id<"chats">;
  modelId: string;
  provider: Provider;
}

function getMessageText(message: UIMessage) {
  if (message.text.trim().length > 0) {
    return message.text;
  }

  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function ChatThread({ chatId, provider, modelId }: ChatThreadProps) {
  const sendMessageMutation = useSendThreadMessageMutation();
  const updateModelMutation = useUpdateThreadModelMutation();

  const { results } = useUIMessages(
    // biome-ignore lint/suspicious/noExplicitAny: hook typing does not infer this generated query reference.
    api.messages.list as any,
    {
      chatId,
    },
    {
      initialNumItems: 20,
      stream: true,
    }
  );

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  const messages = results as UIMessage[];
  const lastMessage = messages.at(-1);
  const isAssistantStreaming =
    lastMessage?.role === "assistant" && lastMessage.status === "pending";

  async function handleSubmit({ prompt }: ChatComposerSubmitPayload) {
    await sendMessageMutation.mutateAsync({ chatId, prompt });
  }

  async function handleModelChange(selection: {
    provider: Provider;
    modelId: string;
  }) {
    const unchanged =
      selection.provider === provider && selection.modelId === modelId;
    if (unchanged || updateModelMutation.isPending) {
      return;
    }

    await updateModelMutation.mutateAsync({
      chatId,
      modelId: selection.modelId,
      provider: selection.provider,
    });
  }

  useEffect(() => {
    const composerElement = composerRef.current;
    if (!composerElement) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      setComposerHeight(composerElement.offsetHeight);
    });

    setComposerHeight(composerElement.offsetHeight);
    resizeObserver.observe(composerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden"
      style={
        {
          "--chat-composer-height": `${composerHeight}px`,
        } as React.CSSProperties
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div
          className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 pb-[calc(var(--chat-composer-height)+1rem)] sm:px-6"
          ref={messagesContainerRef}
        >
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm">No messages yet.</p>
          ) : null}

          {messages.map((message) => {
            const messageText = getMessageText(message);

            return (
              <Message
                from={message.role === "assistant" ? "assistant" : "user"}
                key={message.key}
              >
                <MessageContent>
                  {messageText ? (
                    <MessageResponse>{messageText}</MessageResponse>
                  ) : null}
                </MessageContent>
              </Message>
            );
          })}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
        <div className="pointer-events-auto" ref={composerRef}>
          <ChatComposerProvider
            initialModelId={modelId}
            initialProvider={provider}
            isAssistantStreaming={isAssistantStreaming}
            isModelUpdating={updateModelMutation.isPending}
            isSubmitting={sendMessageMutation.isPending}
            onModelChange={handleModelChange}
            onSubmit={handleSubmit}
          >
            <ChatComposer className="static bottom-auto" />
          </ChatComposerProvider>
        </div>
      </div>
    </div>
  );
}
