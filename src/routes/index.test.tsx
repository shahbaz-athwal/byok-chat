import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createConfiguredProviders } from "@/test/mocks";
import { HomePage } from "./index";

const { toastAddMock } = vi.hoisted(() => ({
  toastAddMock: vi.fn(),
}));
const navigateMock = vi.fn();
const openSettingsMock = vi.fn();
const ensureDraftThreadIdMock = vi.fn();
const consumeDraftThreadIdMock = vi.fn();
const activateDraftMutationHookMock = vi.fn();
const useApiKeySettingsMock = vi.fn();
const useDraftThreadMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({
    useNavigate: () => navigateMock,
  }),
}));

vi.mock("@/components/api-key-settings-provider", () => ({
  useApiKeySettings: () => useApiKeySettingsMock(),
}));

vi.mock("@/components/draft-thread-provider", () => ({
  useDraftThread: () => useDraftThreadMock(),
}));

vi.mock("@/mutations/thread", () => ({
  useActivateDraftAndSendMutation: () => activateDraftMutationHookMock(),
}));

vi.mock("@/components/ui/toast", () => ({
  toastManager: {
    add: toastAddMock,
  },
}));

vi.mock("@/components/chat/chat-composer", async () => {
  const React = await import("react");

  interface MockComposerContextValue {
    initialModelId: string;
    initialProvider: "anthropic" | "google" | "openai";
    isSubmitting?: boolean;
    onModelChange?: (selection: {
      modelId: string;
      provider: "anthropic" | "google" | "openai";
    }) => Promise<void>;
    onSubmit: (payload: {
      modelId: string;
      prompt: string;
      provider: "anthropic" | "google" | "openai";
    }) => Promise<void>;
  }

  const MockComposerContext =
    React.createContext<MockComposerContextValue | null>(null);

  function ChatComposerProvider({
    children,
    ...value
  }: MockComposerContextValue & { children: React.ReactNode }) {
    return (
      <MockComposerContext.Provider value={value}>
        {children}
      </MockComposerContext.Provider>
    );
  }

  function ChatComposer() {
    const context = React.useContext(MockComposerContext);

    if (!context) {
      throw new Error("Missing mock chat composer context");
    }

    return (
      <div>
        <button
          disabled={context.isSubmitting}
          onClick={() => {
            context
              .onSubmit({
                modelId: context.initialModelId,
                prompt: "Composer prompt",
                provider: context.initialProvider,
              })
              .catch(() => undefined);
          }}
          type="button"
        >
          Submit composer
        </button>
        <button
          onClick={() => {
            context
              .onModelChange?.({
                modelId: "claude-opus-4-6",
                provider: "anthropic",
              })
              ?.catch(() => undefined);
          }}
          type="button"
        >
          Switch composer model
        </button>
      </div>
    );
  }

  return {
    ChatComposer,
    ChatComposerProvider,
  };
});

interface Deferred<T> {
  promise: Promise<T>;
  reject: (error: unknown) => void;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
}

function renderHomePage() {
  render(<HomePage />);
  return userEvent.setup();
}

describe("HomePage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    openSettingsMock.mockReset();
    ensureDraftThreadIdMock.mockReset();
    consumeDraftThreadIdMock.mockReset();
    activateDraftMutationHookMock.mockReset();
    toastAddMock.mockReset();
    useApiKeySettingsMock.mockReset();
    useDraftThreadMock.mockReset();
    useApiKeySettingsMock.mockReturnValue({
      configuredProviders: createConfiguredProviders({ openai: true }),
      openSettings: openSettingsMock,
    });
    useDraftThreadMock.mockReturnValue({
      consumeDraftThreadId: consumeDraftThreadIdMock,
      draftThreadId: "draft-1",
      ensureDraftThreadId: ensureDraftThreadIdMock,
    });
    activateDraftMutationHookMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(async () => undefined),
    });
  });

  it("opens settings when a common question is selected without a configured provider", async () => {
    useApiKeySettingsMock.mockReturnValue({
      configuredProviders: createConfiguredProviders({ openai: false }),
      openSettings: openSettingsMock,
    });

    const user = renderHomePage();

    await user.click(screen.getByRole("button", { name: "How does AI work?" }));

    expect(openSettingsMock).toHaveBeenCalledTimes(1);
  });

  it("opens settings when the composer submit starts without a configured provider", async () => {
    useApiKeySettingsMock.mockReturnValue({
      configuredProviders: createConfiguredProviders({ openai: false }),
      openSettings: openSettingsMock,
    });

    const user = renderHomePage();

    await user.click(screen.getByRole("button", { name: "Submit composer" }));

    expect(openSettingsMock).toHaveBeenCalledTimes(1);
  });

  it("starts a chat successfully, navigates, and consumes the warmed draft id", async () => {
    ensureDraftThreadIdMock.mockResolvedValue("draft-1");
    const mutateAsync = vi.fn(async () => undefined);
    activateDraftMutationHookMock.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    const user = renderHomePage();

    await user.click(screen.getByRole("button", { name: "Submit composer" }));

    expect(ensureDraftThreadIdMock).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({
      modelId: "gpt-5-nano",
      prompt: "Composer prompt",
      provider: "openai",
      threadId: "draft-1",
      title: "Composer prompt",
    });
    expect(navigateMock).toHaveBeenCalledWith({
      params: { threadId: "draft-1" },
      to: "/chat/$threadId",
    });
    await waitFor(() => {
      expect(consumeDraftThreadIdMock).toHaveBeenCalledWith("draft-1");
    });
  });

  it("shows an error toast and does not navigate when draft preparation fails", async () => {
    ensureDraftThreadIdMock.mockRejectedValue(
      new Error("Could not warm draft")
    );

    const user = renderHomePage();

    await user.click(screen.getByRole("button", { name: "Submit composer" }));

    await waitFor(() => {
      expect(toastAddMock).toHaveBeenCalledWith({
        description: "Could not warm draft",
        title: "Failed to prepare chat",
        type: "error",
      });
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("disables common-question buttons while a chat start is in flight", async () => {
    ensureDraftThreadIdMock.mockResolvedValue("draft-1");
    const deferred = createDeferred<void>();
    activateDraftMutationHookMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(() => deferred.promise),
    });

    const user = renderHomePage();

    await user.click(screen.getByRole("button", { name: "Submit composer" }));

    expect(
      screen.getByRole("button", { name: "How does AI work?" })
    ).toBeDisabled();
    deferred.resolve();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "How does AI work?" })
      ).not.toBeDisabled();
    });
  });

  it("uses the updated local provider and model for common-question starts", async () => {
    useApiKeySettingsMock.mockReturnValue({
      configuredProviders: createConfiguredProviders({
        anthropic: true,
        openai: true,
      }),
      openSettings: openSettingsMock,
    });
    ensureDraftThreadIdMock.mockResolvedValue("draft-2");
    const mutateAsync = vi.fn(async () => undefined);
    activateDraftMutationHookMock.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    const user = renderHomePage();

    await user.click(
      screen.getByRole("button", { name: "Switch composer model" })
    );
    await user.click(
      screen.getByRole("button", { name: "Are black holes real?" })
    );

    expect(mutateAsync).toHaveBeenCalledWith({
      modelId: "claude-opus-4-6",
      prompt: "Are black holes real?",
      provider: "anthropic",
      threadId: "draft-2",
      title: "Are black holes real?",
    });
  });
});
