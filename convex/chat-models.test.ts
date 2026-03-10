import { describe, expect, it } from "vitest";
import {
  DEFAULT_MODEL_BY_PROVIDER,
  decodeModelValue,
  encodeModelValue,
  resolveRequestedModelOrThrow,
} from "../shared/chat-models";

describe("chat-models", () => {
  it("falls back to the provider default model", () => {
    expect(resolveRequestedModelOrThrow("openai")).toBe(
      DEFAULT_MODEL_BY_PROVIDER.openai
    );
  });

  it("throws for unsupported models", () => {
    expect(() =>
      resolveRequestedModelOrThrow("google", "gpt-5-mini")
    ).toThrowError('Unsupported model "gpt-5-mini"');
  });

  it("round-trips encoded model selections", () => {
    const value = encodeModelValue("anthropic", "claude-haiku-4-5");
    expect(decodeModelValue(value)).toEqual({
      modelId: "claude-haiku-4-5",
      provider: "anthropic",
    });
  });

  it("returns null for malformed encoded values", () => {
    expect(decodeModelValue("missing-delimiter")).toBeNull();
    expect(decodeModelValue("unknown:gpt-5-mini")).toBeNull();
    expect(decodeModelValue("openai:")).toBeNull();
  });
});
