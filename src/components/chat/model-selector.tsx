"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CHAT_MODEL_OPTIONS,
  type ChatModelSelection,
  decodeModelValue,
  encodeModelValue,
  PROVIDER_LABELS,
  type Provider,
} from "@/lib/chat-models";
import { cn } from "@/lib/utils";

interface ChatModelSelectorProps {
  disabled?: boolean;
  modelId: string;
  onChange: (selection: ChatModelSelection) => void;
  provider: Provider;
  triggerClassName?: string;
}

export function ChatModelSelector({
  provider,
  modelId,
  onChange,
  disabled = false,
  triggerClassName,
}: ChatModelSelectorProps) {
  const grouped = {
    openai: CHAT_MODEL_OPTIONS.filter((option) => option.provider === "openai"),
    google: CHAT_MODEL_OPTIONS.filter((option) => option.provider === "google"),
    anthropic: CHAT_MODEL_OPTIONS.filter(
      (option) => option.provider === "anthropic"
    ),
  };

  const value = encodeModelValue(provider, modelId);

  return (
    <Select
      disabled={disabled}
      onValueChange={(nextValue) => {
        if (!nextValue) {
          return;
        }

        const nextSelection = decodeModelValue(nextValue);
        if (nextSelection) {
          onChange(nextSelection);
        }
      }}
      value={value}
    >
      <SelectTrigger
        className={cn("w-full sm:w-72", triggerClassName)}
        size="sm"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(grouped) as Provider[]).map((groupProvider) => (
          <SelectGroup key={groupProvider}>
            <SelectGroupLabel>
              {PROVIDER_LABELS[groupProvider]}
            </SelectGroupLabel>
            {grouped[groupProvider].map((option) => (
              <SelectItem
                key={`${option.provider}-${option.modelId}`}
                value={encodeModelValue(option.provider, option.modelId)}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
