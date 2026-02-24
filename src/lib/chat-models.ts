export type Provider = "openai" | "google" | "anthropic";

export interface ModelOption {
  label: string;
  modelId: string;
  provider: Provider;
}

export const CHAT_MODEL_OPTIONS: readonly ModelOption[] = [
  { provider: "openai", modelId: "gpt-5.2", label: "GPT-5.2" },
  { provider: "openai", modelId: "gpt-5-mini", label: "GPT-5 mini" },
  { provider: "openai", modelId: "gpt-5-nano", label: "GPT-5 nano" },
  {
    provider: "google",
    modelId: "gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro Preview",
  },
  {
    provider: "google",
    modelId: "gemini-3-flash-preview",
    label: "Gemini 3 Flash Preview",
  },
  {
    provider: "google",
    modelId: "gemini-3-pro-preview",
    label: "Gemini 3 Pro Preview",
  },
  {
    provider: "anthropic",
    modelId: "claude-opus-4-6",
    label: "Claude Opus 4.6",
  },
  {
    provider: "anthropic",
    modelId: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
  },
  {
    provider: "anthropic",
    modelId: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
  },
];

export const DEFAULT_MODEL_BY_PROVIDER: Record<Provider, string> = {
  openai: "gpt-5-nano",
  google: "gemini-3.1-pro-preview",
  anthropic: "claude-opus-4-6",
};

export const DEFAULT_PROVIDER: Provider = "openai";

export const encodeModelValue = (provider: Provider, modelId: string) =>
  `${provider}:${modelId}`;

export const decodeModelValue = (value: string) => {
  const [provider, ...modelIdParts] = value.split(":");
  const modelId = modelIdParts.join(":");

  if (
    (provider === "openai" ||
      provider === "google" ||
      provider === "anthropic") &&
    modelId.length > 0
  ) {
    return { provider, modelId };
  }

  return null;
};
