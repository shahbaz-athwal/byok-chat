"use client";

import { useUIMessages } from "@convex-dev/agent/react";
import { useMutation } from "convex/react";
import { SendIcon } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  Attachment,
  type AttachmentData,
  AttachmentInfo,
  AttachmentPreview,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Provider } from "@/lib/chat-models";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ChatModelSelector } from "./model-selector";

interface ChatThreadProps {
  chatId: Id<"chats">;
  modelId: string;
  provider: Provider;
}

interface UIMessagePart {
  type: string;
  [key: string]: unknown;
}

type ToolState =
  | "input-available"
  | "input-streaming"
  | "output-available"
  | "output-error";

const TOOL_STATES = new Set<ToolState>([
  "input-available",
  "input-streaming",
  "output-available",
  "output-error",
]);

function toToolState(value: unknown): ToolState {
  if (
    (value === "input-available" ||
      value === "input-streaming" ||
      value === "output-available" ||
      value === "output-error") &&
    TOOL_STATES.has(value)
  ) {
    return value;
  }
  return "input-streaming";
}

function getTextPart(part: UIMessagePart) {
  if (part.type !== "text") {
    return null;
  }
  return typeof part.text === "string" ? part.text : null;
}

function getReasoningPart(part: UIMessagePart) {
  if (part.type !== "reasoning") {
    return null;
  }
  if (typeof part.text === "string") {
    return part.text;
  }
  return null;
}

interface RenderVisiblePartParams {
  isLatestMessage: boolean;
  isPending: boolean;
  messageKey: string;
  part: UIMessagePart;
  partIndex: number;
}

function renderVisiblePart({
  part,
  partIndex,
  messageKey,
  isLatestMessage,
  isPending,
}: RenderVisiblePartParams) {
  const textPart = getTextPart(part);
  if (textPart) {
    return (
      <MessageResponse key={`${messageKey}-text-${partIndex}`}>
        {textPart}
      </MessageResponse>
    );
  }

  const reasoningText = getReasoningPart(part);
  if (reasoningText) {
    return (
      <Reasoning
        isStreaming={isLatestMessage && isPending}
        key={`${messageKey}-reasoning-${partIndex}`}
      >
        <ReasoningTrigger />
        <ReasoningContent>{reasoningText}</ReasoningContent>
      </Reasoning>
    );
  }

  const isToolPart =
    part.type === "dynamic-tool" || part.type.startsWith("tool-");
  if (!isToolPart) {
    return null;
  }

  const partState = toToolState(part.state);
  const toolInput = part.input;
  const toolOutput = part.output;
  const toolError =
    typeof part.errorText === "string" ? part.errorText : undefined;

  return (
    <Tool key={`${messageKey}-tool-${partIndex}`}>
      {part.type === "dynamic-tool" ? (
        <ToolHeader
          state={partState}
          toolName={
            typeof part.toolName === "string" ? part.toolName : "dynamic-tool"
          }
          type="dynamic-tool"
        />
      ) : (
        <ToolHeader state={partState} type={part.type as `tool-${string}`} />
      )}
      <ToolContent>
        {toolInput ? <ToolInput input={toolInput} /> : null}
        <ToolOutput errorText={toolError} output={toolOutput} />
      </ToolContent>
    </Tool>
  );
}

function isAttachmentPart(part: UIMessagePart) {
  return part.type === "file" || part.type === "source-document";
}

function toAttachment(
  part: UIMessagePart,
  fallbackId: string
): AttachmentData | null {
  if (part.type === "file") {
    return {
      ...part,
      id: typeof part.id === "string" ? part.id : fallbackId,
    } as AttachmentData;
  }

  if (part.type === "source-document") {
    return {
      ...part,
      id: typeof part.id === "string" ? part.id : fallbackId,
    } as AttachmentData;
  }

  return null;
}

export function ChatThread({ chatId, provider, modelId }: ChatThreadProps) {
  const sendMessage = useMutation(api.messages.send);
  const updateModel = useMutation(api.threads.updateModel);
  // const listMessagesQuery = api.messages.list as unknown as Parameters<
  //   typeof useUIMessages
  // >[0];
  const { results } = useUIMessages(
    api.messages.list as any,
    {
      chatId,
    },
    {
      initialNumItems: 20,
      stream: true,
    }
  );

  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider>(provider);
  const [selectedModelId, setSelectedModelId] = useState(modelId);
  const [isUpdatingModel, setIsUpdatingModel] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messages = results;
  const lastMessage = messages.at(-1);
  const isAssistantStreaming =
    lastMessage?.role === "assistant" && lastMessage.status === "pending";

  useEffect(() => {
    setSelectedProvider(provider);
    setSelectedModelId(modelId);
  }, [provider, modelId]);

  useEffect(() => {
    const element = messagesContainerRef.current;
    if (!element || messages.length === 0) {
      return;
    }
    element.scrollTo({
      top: element.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isSending || isAssistantStreaming) {
      return;
    }

    setSendError(null);
    setIsSending(true);
    try {
      await sendMessage({ chatId, prompt: trimmed });
      setPrompt("");
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Failed to send message"
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleModelChange(selection: {
    provider: Provider;
    modelId: string;
  }) {
    const unchanged =
      selection.provider === selectedProvider &&
      selection.modelId === selectedModelId;
    if (unchanged || isUpdatingModel) {
      return;
    }

    setModelError(null);
    setSelectedProvider(selection.provider);
    setSelectedModelId(selection.modelId);
    setIsUpdatingModel(true);
    try {
      await updateModel({
        chatId,
        provider: selection.provider,
        modelId: selection.modelId,
      });
    } catch (error) {
      setModelError(
        error instanceof Error ? error.message : "Failed to update model"
      );
      setSelectedProvider(provider);
      setSelectedModelId(modelId);
    } finally {
      setIsUpdatingModel(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <ChatModelSelector
            disabled={isUpdatingModel}
            modelId={selectedModelId}
            onChange={handleModelChange}
            provider={selectedProvider}
          />
          {modelError ? (
            <p className="text-destructive text-xs">{modelError}</p>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          className="mx-auto flex h-full w-full max-w-4xl flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-6"
          ref={messagesContainerRef}
        >
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm">No messages yet.</p>
          ) : null}

          {messages.map((message, messageIndex) => {
            const parts = Array.isArray(message.parts) ? message.parts : [];
            const attachments = parts
              .filter(isAttachmentPart)
              .map((part, index) =>
                toAttachment(part, `${message.key}-attachment-${index}`)
              )
              .filter((part): part is AttachmentData => part !== null);

            const visibleParts = parts.filter(
              (part) => !isAttachmentPart(part)
            );

            return (
              <Message
                from={message.role === "assistant" ? "assistant" : "user"}
                key={message.key}
              >
                <MessageContent>
                  {visibleParts.length === 0 &&
                  typeof message.text === "string" ? (
                    <MessageResponse>{message.text}</MessageResponse>
                  ) : null}

                  {visibleParts.map((part, partIndex) =>
                    renderVisiblePart({
                      isLatestMessage: messageIndex === messages.length - 1,
                      isPending: message.status === "pending",
                      messageKey: message.key,
                      part,
                      partIndex,
                    })
                  )}

                  {attachments.length > 0 ? (
                    <Attachments
                      className={cn(message.role === "user" && "ml-auto")}
                    >
                      {attachments.map((attachment) => (
                        <Attachment
                          data={attachment}
                          key={attachment.id}
                          title={attachment.filename}
                        >
                          <AttachmentPreview />
                          <AttachmentInfo />
                        </Attachment>
                      ))}
                    </Attachments>
                  ) : null}
                </MessageContent>
              </Message>
            );
          })}
        </div>
      </div>

      <form className="border-t px-4 py-3 sm:px-6" onSubmit={handleSubmit}>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
          <Textarea
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Send a message..."
            value={prompt}
          />
          <div className="flex justify-end">
            <Button
              disabled={
                isSending || isAssistantStreaming || prompt.trim().length === 0
              }
              size="sm"
              type="submit"
            >
              <SendIcon />
              Send
            </Button>
          </div>
          {sendError ? (
            <p className="text-destructive text-xs">{sendError}</p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
