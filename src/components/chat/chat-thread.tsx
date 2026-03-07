"use client";

import {
  type UIMessage,
  useStreamingUIMessages,
} from "@convex-dev/agent/react";
import type { Provider } from "@shared/chat-models";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowDownIcon } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { AssistantMessageMarkdown } from "@/components/chat/assistant-message-markdown";
import { ChatMessage, ChatMessageBubble } from "@/components/chat/chat-message";
import { useDraftThread } from "@/components/draft-thread-provider";
import { Button } from "@/components/ui/button";
import { deriveThreadTitle } from "@/lib/thread-drafts";
import {
  useActivateDraftAndSendMutation,
  useSendThreadMessageMutation,
  useUpdateThreadModelMutation,
} from "@/mutations/thread";
import { threadMessagesQuery } from "@/queries/messages";
import { api } from "../../../convex/_generated/api";
import {
  ChatComposer,
  ChatComposerProvider,
  type ChatComposerSubmitPayload,
} from "./chat-composer";

interface ChatThreadProps {
  modelId: string;
  provider: Provider;
  status: "active" | "archived" | "draft";
  threadId: string;
}

interface ChatRenderableMessage {
  content: string;
  key: string;
  role: "assistant" | "user";
}

interface DedupedMessageKey {
  order: number;
  stepOrder: number;
}

function compareMessages(left: DedupedMessageKey, right: DedupedMessageKey) {
  if (left.order !== right.order) {
    return left.order - right.order;
  }

  return left.stepOrder - right.stepOrder;
}

function dedupeMessages(messages: UIMessage[], streamMessages: UIMessage[]) {
  return [...messages, ...streamMessages]
    .sort(compareMessages)
    .reduce((dedupedMessages, message) => {
      const previousMessage = dedupedMessages.at(-1);

      if (
        !previousMessage ||
        previousMessage.order !== message.order ||
        previousMessage.stepOrder !== message.stepOrder
      ) {
        dedupedMessages.push(message);
        return dedupedMessages;
      }

      if (
        (previousMessage.status === "pending" ||
          previousMessage.status === "streaming") &&
        message.status !== "pending"
      ) {
        dedupedMessages[dedupedMessages.length - 1] = message;
      }

      return dedupedMessages;
    }, [] as UIMessage[]);
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

function normalizeChatMessage(
  message: UIMessage
): ChatRenderableMessage | null {
  if (message.role !== "assistant" && message.role !== "user") {
    return null;
  }

  return {
    key: message.key,
    role: message.role,
    content: getMessageText(message),
  };
}

function ScrollToBottomButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-100 flex justify-center"
      style={{
        bottom: "calc(var(--chat-composer-height) + 0.75rem)",
      }}
    >
      <Button
        aria-label="Scroll to latest message"
        className="pointer-events-auto rounded-full"
        onClick={() => scrollToBottom({ animation: "instant" })}
        size="icon"
        type="button"
      >
        <ArrowDownIcon />
      </Button>
    </div>
  );
}

export function ChatThread({
  threadId,
  provider,
  modelId,
  status,
}: ChatThreadProps) {
  const { consumeDraftThreadId } = useDraftThread();
  const activateDraftAndSendMutation = useActivateDraftAndSendMutation();
  const sendMessageMutation = useSendThreadMessageMutation();
  const updateModelMutation = useUpdateThreadModelMutation();
  const { data } = useSuspenseQuery(threadMessagesQuery(threadId));
  const startOrder = data.page.length > 0 ? data.page[0].order : 0;
  const streamMessages = useStreamingUIMessages(
    api.messages.list,
    {
      paginationOpts: {
        cursor: null,
        numItems: 0,
      },
      threadId,
    },
    { startOrder }
  );
  const results = dedupeMessages(data.page, streamMessages ?? []);

  const composerRef = useRef<HTMLDivElement>(null);
  const [composerHeight, setComposerHeight] = useState(0);
  const messages: ChatRenderableMessage[] = results
    .map(normalizeChatMessage)
    .filter((message): message is ChatRenderableMessage => message !== null);
  const lastMessage = results.at(-1);
  const isAssistantStreaming =
    lastMessage?.role === "assistant" &&
    (lastMessage.status === "pending" || lastMessage.status === "streaming");
  const hasSettledMessages = results.some(
    (message) => message.status !== "pending"
  );
  const isInitialPromptPending =
    results.some(
      (message) => message.role === "user" && message.status === "pending"
    ) && !hasSettledMessages;

  async function handleSubmit({
    prompt,
    provider: selectedProvider,
    modelId: selectedModelId,
  }: ChatComposerSubmitPayload) {
    if (status === "draft") {
      const title = deriveThreadTitle(prompt);

      await activateDraftAndSendMutation.mutateAsync({
        modelId: selectedModelId,
        prompt,
        provider: selectedProvider,
        threadId,
        title,
      });
      consumeDraftThreadId(threadId);
      return;
    }

    await sendMessageMutation.mutateAsync({ prompt, threadId });
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
      modelId: selection.modelId,
      provider: selection.provider,
      threadId,
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
        } as CSSProperties
      }
    >
      <StickToBottom
        className="relative min-h-0 flex-1"
        initial="instant"
        resize="instant"
      >
        <StickToBottom.Content
          className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 pb-[calc(var(--chat-composer-height)+1rem)] sm:px-6"
          scrollClassName="min-h-0 h-full overflow-y-auto overscroll-y-contain"
        >
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm">No messages yet.</p>
          ) : null}

          {messages.map((message) => {
            return (
              <ChatMessage key={message.key} role={message.role}>
                <ChatMessageBubble role={message.role}>
                  {message.role === "assistant" ? (
                    <AssistantMessageMarkdown markdown={message.content} />
                  ) : (
                    message.content
                  )}
                </ChatMessageBubble>
              </ChatMessage>
            );
          })}
        </StickToBottom.Content>
        <ScrollToBottomButton />
      </StickToBottom>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
        <div className="pointer-events-auto" ref={composerRef}>
          <ChatComposerProvider
            initialModelId={modelId}
            initialProvider={provider}
            isAssistantStreaming={isAssistantStreaming}
            isModelUpdating={updateModelMutation.isPending}
            isSubmitting={
              sendMessageMutation.isPending ||
              activateDraftAndSendMutation.isPending ||
              isInitialPromptPending
            }
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
