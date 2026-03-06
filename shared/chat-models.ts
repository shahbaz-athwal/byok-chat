export const PROVIDERS = ["openai", "google", "anthropic"] as const;

export type Provider = (typeof PROVIDERS)[number];

export interface ModelOption {
  label: string;
  modelId: string;
  provider: Provider;
}

export interface ChatModelSelection {
  modelId: string;
  provider: Provider;
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  anthropic: "Anthropic",
  google: "Google",
  openai: "OpenAI",
};

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

export const MODEL_OPTIONS_BY_PROVIDER: Record<
  Provider,
  readonly ModelOption[]
> = {
  anthropic: CHAT_MODEL_OPTIONS.filter(
    (option) => option.provider === "anthropic"
  ),
  google: CHAT_MODEL_OPTIONS.filter((option) => option.provider === "google"),
  openai: CHAT_MODEL_OPTIONS.filter((option) => option.provider === "openai"),
};

export const SUPPORTED_MODELS: Record<Provider, readonly string[]> = {
  anthropic: MODEL_OPTIONS_BY_PROVIDER.anthropic.map(
    (option) => option.modelId
  ),
  google: MODEL_OPTIONS_BY_PROVIDER.google.map((option) => option.modelId),
  openai: MODEL_OPTIONS_BY_PROVIDER.openai.map((option) => option.modelId),
};

export const DEFAULT_MODEL_BY_PROVIDER: Record<Provider, string> = {
  anthropic: "claude-opus-4-6",
  google: "gemini-3.1-pro-preview",
  openai: "gpt-5-nano",
};

export const DEFAULT_PROVIDER: Provider = "openai";

export function assertSupportedModel(
  provider: Provider,
  modelId: string
): void {
  const supportedModels = SUPPORTED_MODELS[provider];

  if (!supportedModels.includes(modelId)) {
    throw new Error(
      `Unsupported model "${modelId}" for provider "${provider}". Supported: ${supportedModels.join(", ")}`
    );
  }
}

export function resolveRequestedModelOrThrow(
  provider: Provider,
  modelId?: string | null
): string {
  const resolvedModelId = modelId ?? DEFAULT_MODEL_BY_PROVIDER[provider];
  assertSupportedModel(provider, resolvedModelId);
  return resolvedModelId;
}

export function encodeModelValue(provider: Provider, modelId: string): string {
  return `${provider}:${modelId}`;
}

export function decodeModelValue(value: string): ChatModelSelection | null {
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
}
