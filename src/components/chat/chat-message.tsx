"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ChatMessageProps extends HTMLAttributes<HTMLDivElement> {
  role: "assistant" | "user";
}

export function ChatMessage({ className, role, ...props }: ChatMessageProps) {
  return (
    <div
      className={cn(
        "group flex w-full flex-col gap-2",
        role === "user"
          ? "is-user ml-auto max-w-[95%] justify-end"
          : "is-assistant",
        className
      )}
      {...props}
    />
  );
}

export interface ChatMessageBubbleProps extends HTMLAttributes<HTMLDivElement> {
  role: "assistant" | "user";
}

export function ChatMessageBubble({
  children,
  className,
  role,
  ...props
}: ChatMessageBubbleProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-col gap-2 overflow-hidden text-sm",
        role === "user"
          ? "ml-auto w-fit whitespace-pre-wrap rounded-lg bg-secondary px-4 py-3 text-foreground"
          : "w-full text-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
