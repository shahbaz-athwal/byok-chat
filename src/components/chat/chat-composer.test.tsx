import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConfiguredProviders } from "@/test/mocks";
import { ChatComposer, ChatComposerProvider } from "./chat-composer";

const useApiKeySettingsMock = vi.fn();

vi.mock("@/components/api-key-settings-provider", () => ({
  useApiKeySettings: () => useApiKeySettingsMock(),
}));

vi.mock("./model-selector", () => ({
  ChatModelSelector: ({
    disabled,
    modelId,
    onChange,
    provider,
  }: {
    disabled?: boolean;
    modelId: string;
    onChange: (selection: {
      modelId: string;
      provider: "anthropic" | "google" | "openai";
    }) => Promise<void>;
    provider: "anthropic" | "google" | "openai";
  }) => (
    <div>
      <output data-testid="model-selection">
        {provider}:{modelId}
      </output>
      <button
        disabled={disabled}
        onClick={() => {
          onChange({ modelId, provider }).catch(() => undefined);
        }}
        type="button"
      >
        Keep current model
      </button>
      <button
        disabled={disabled}
        onClick={() => {
          onChange({
            modelId: "claude-opus-4-6",
            provider: "anthropic",
          }).catch(() => undefined);
        }}
        type="button"
      >
        Switch to Claude
      </button>
    </div>
  ),
}));

interface RenderComposerOptions {
  configuredProviders?: ReturnType<typeof createConfiguredProviders>;
  onModelChange?: (selection: {
    modelId: string;
    provider: "anthropic" | "google" | "openai";
  }) => Promise<void>;
  onSubmit?: (payload: {
    modelId: string;
    prompt: string;
    provider: "anthropic" | "google" | "openai";
  }) => Promise<void>;
  openSettings?: () => void;
}

function renderComposer(options: RenderComposerOptions = {}) {
  const onSubmit = vi.fn(options.onSubmit ?? (async () => undefined));
  const onModelChange = vi.fn(options.onModelChange ?? (async () => undefined));
  const openSettings = vi.fn(options.openSettings ?? (() => undefined));

  useApiKeySettingsMock.mockReturnValue({
    configuredProviders:
      options.configuredProviders ??
      createConfiguredProviders({ openai: true }),
    openSettings,
  });

  render(
    <ChatComposerProvider
      initialModelId="gpt-5-nano"
      initialProvider="openai"
      onModelChange={onModelChange}
      onSubmit={onSubmit}
    >
      <ChatComposer />
    </ChatComposerProvider>
  );

  return {
    onModelChange,
    onSubmit,
    openSettings,
    user: userEvent.setup(),
  };
}

describe("ChatComposer", () => {
  beforeEach(() => {
    useApiKeySettingsMock.mockReset();
  });

  it("blocks submit when the prompt is blank", async () => {
    const { onSubmit, user } = renderComposer();

    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks submit when no key exists for the selected provider", async () => {
    const { onSubmit, user } = renderComposer({
      configuredProviders: createConfiguredProviders({ openai: false }),
    });

    await user.type(
      screen.getByPlaceholderText("Type your message here..."),
      "Hi"
    );

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(screen.getByText("Open settings")).toBeVisible();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears the prompt after a successful submit", async () => {
    const { onSubmit, user } = renderComposer();
    const textarea = screen.getByPlaceholderText("Type your message here...");

    await user.type(textarea, "Hello there");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).toHaveBeenCalledWith({
      modelId: "gpt-5-nano",
      prompt: "Hello there",
      provider: "openai",
    });
    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("preserves the prompt when submit rejects", async () => {
    const { onSubmit, user } = renderComposer({
      onSubmit: () => Promise.reject(new Error("submit failed")),
    });
    const textarea = screen.getByPlaceholderText("Type your message here...");

    await user.type(textarea, "Keep me");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(textarea).toHaveValue("Keep me");
  });

  it("submits when Enter is pressed", async () => {
    const { onSubmit, user } = renderComposer();
    const textarea = screen.getByPlaceholderText("Type your message here...");

    await user.type(textarea, "Enter submit");
    fireEvent.keyDown(textarea, { key: "Enter" });

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        modelId: "gpt-5-nano",
        prompt: "Enter submit",
        provider: "openai",
      });
    });
  });

  it("does not submit on Shift+Enter", async () => {
    const { onSubmit, user } = renderComposer();
    const textarea = screen.getByPlaceholderText("Type your message here...");

    await user.type(textarea, "Line one");
    await user.keyboard("{Shift>}{Enter}{/Shift}");

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exposes the settings CTA when the provider is not configured", async () => {
    const { openSettings, user } = renderComposer({
      configuredProviders: createConfiguredProviders({ openai: false }),
    });

    await user.click(screen.getByRole("button", { name: "Open settings" }));

    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it("calls the model-change callback when the selection changes", async () => {
    const { onModelChange, user } = renderComposer();

    await user.click(screen.getByRole("button", { name: "Switch to Claude" }));

    expect(onModelChange).toHaveBeenCalledWith({
      modelId: "claude-opus-4-6",
      provider: "anthropic",
    });
  });

  it("rolls model state back when model change fails", async () => {
    const { user } = renderComposer({
      onModelChange: () => Promise.reject(new Error("model change failed")),
    });

    await user.click(screen.getByRole("button", { name: "Switch to Claude" }));

    await waitFor(() => {
      expect(screen.getByTestId("model-selection")).toHaveTextContent(
        "openai:gpt-5-nano"
      );
    });
  });
});
