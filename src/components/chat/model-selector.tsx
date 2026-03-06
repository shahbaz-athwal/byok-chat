"use client";

import {
  type ChatModelSelection,
  decodeModelValue,
  encodeModelValue,
  MODEL_OPTIONS_BY_PROVIDER,
  PROVIDER_LABELS,
  PROVIDERS,
  type Provider,
} from "@shared/chat-models";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        {PROVIDERS.map((groupProvider) => (
          <SelectGroup key={groupProvider}>
            <SelectGroupLabel>
              {PROVIDER_LABELS[groupProvider]}
            </SelectGroupLabel>
            {MODEL_OPTIONS_BY_PROVIDER[groupProvider].map((option) => (
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
