"use client";

import type { CSSProperties } from "react";
import {
  ChatMessage,
  ChatMessageBubble,
} from "@/components/chat/chat-message";

const DOT_DELAYS_MS = [0, 150, 300] as const;

export interface ChatTypingIndicatorProps {
  label?: string;
}

export function ChatTypingIndicator({
  label = "Assistant is typing",
}: ChatTypingIndicatorProps) {
  return (
    <ChatMessage aria-atomic="true" aria-live="polite" role="assistant">
      <ChatMessageBubble
        className="w-fit rounded-3xl border border-border/60 bg-muted/60 px-4 py-3"
        role="assistant"
      >
        <span className="sr-only">{label}</span>
        <span aria-hidden="true" className="flex items-center gap-1.5">
          {DOT_DELAYS_MS.map((delayMs) => (
            <span
              className="size-2 rounded-full bg-muted-foreground/70 animate-pulse"
              key={delayMs}
              style={
                {
                  animationDelay: `${delayMs}ms`,
                  animationDuration: "1.1s",
                } as CSSProperties
              }
            />
          ))}
        </span>
      </ChatMessageBubble>
    </ChatMessage>
  );
}
