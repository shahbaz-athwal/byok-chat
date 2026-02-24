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
  encodeModelValue,
  type Provider,
} from "@/lib/chat-models";

type ChatModelSelectorProps = {
  provider: Provider;
  modelId: string;
  onChange: (selection: { provider: Provider; modelId: string }) => void;
  disabled?: boolean;
};

const providerLabel: Record<Provider, string> = {
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic",
};

export function ChatModelSelector({
  provider,
  modelId,
  onChange,
  disabled = false,
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
        const [nextProvider, ...modelIdParts] = nextValue.split(":");
        const nextModelId = modelIdParts.join(":");
        if (
          (nextProvider === "openai" ||
            nextProvider === "google" ||
            nextProvider === "anthropic") &&
          nextModelId
        ) {
          onChange({ provider: nextProvider, modelId: nextModelId });
        }
      }}
      value={value}
    >
      <SelectTrigger className="w-full sm:w-72" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(grouped) as Provider[]).map((groupProvider) => (
          <SelectGroup key={groupProvider}>
            <SelectGroupLabel>{providerLabel[groupProvider]}</SelectGroupLabel>
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
