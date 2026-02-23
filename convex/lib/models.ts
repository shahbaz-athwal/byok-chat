import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { Provider } from "../schema";

export const SUPPORTED_MODELS: Record<Provider, readonly string[]> = {
  openai: ["gpt-5.2", "gpt-5-mini", "gpt-5-nano"],
  google: [
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
  ],
  anthropic: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"],
} as const;

export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-5-nano",
  google: "gemini-3.1-pro-preview",
  anthropic: "claude-opus-4-6",
};

export function resolveModel(
  provider: Provider,
  modelId: string,
  apiKey: string
): LanguageModel {
  const models = SUPPORTED_MODELS[provider];
  if (!models.includes(modelId)) {
    throw new Error(
      `Unsupported model "${modelId}" for provider "${provider}". Supported: ${models.join(", ")}`
    );
  }

  switch (provider) {
    case "openai":
      return createOpenAI({ apiKey })(modelId);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown provider: ${_exhaustive}`);
    }
  }
}
