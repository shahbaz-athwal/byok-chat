import type { UIMessage } from "@convex-dev/agent/react";
import { queryOptions } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ThreadMessagesResult } from "@/lib/thread-drafts";
import {
  createConfiguredProviders,
  createMutationResult,
  createThreadMessage,
  createThreadMessagesResult,
} from "@/test/mocks";
import { renderWithQueryClient } from "@/test/render";
import { ChatThread } from "./chat-thread";

let threadMessagesData: ThreadMessagesResult = createThreadMessagesResult();
let streamMessages: UIMessage[] = [];
const activateDraftMutationHookMock = vi.fn();
const sendMessageMutationHookMock = vi.fn();
const updateModelMutationHookMock = vi.fn();
const consumeDraftThreadIdMock = vi.fn();
const useApiKeySettingsMock = vi.fn();

vi.mock("@/queries/messages", () => ({
  threadMessagesQuery: (threadId: string) =>
    queryOptions({
      queryFn: async () => threadMessagesData,
      queryKey: ["messages", threadId],
    }),
}));

vi.mock("@/components/draft-thread-provider", () => ({
  useDraftThread: () => ({
    consumeDraftThreadId: consumeDraftThreadIdMock,
    draftThreadId: "draft-1",
    ensureDraftThreadId: vi.fn(),
  }),
}));

vi.mock("@/components/api-key-settings-provider", () => ({
  useApiKeySettings: () => useApiKeySettingsMock(),
}));

vi.mock("@/mutations/thread", () => ({
  useActivateDraftAndSendMutation: () => activateDraftMutationHookMock(),
  useSendThreadMessageMutation: () => sendMessageMutationHookMock(),
  useUpdateThreadModelMutation: () => updateModelMutationHookMock(),
}));

vi.mock("@convex-dev/agent/react", () => ({
  useStreamingUIMessages: () => streamMessages,
}));

vi.mock("./assistant-message-markdown", () => ({
  AssistantMessageMarkdown: ({ markdown }: { markdown: string }) => (
    <div>{markdown}</div>
  ),
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
      <output data-testid="thread-model-selection">
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

vi.mock("use-stick-to-bottom", () => {
  function StickToBottom({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) {
    return <div className={className}>{children}</div>;
  }

  function Content({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    scrollClassName?: string;
  }) {
    return <div className={className}>{children}</div>;
  }

  StickToBottom.Content = Content;

  return {
    StickToBottom,
    useStickToBottomContext: () => ({
      isAtBottom: true,
      scrollToBottom: vi.fn(),
    }),
  };
});

interface RenderThreadOptions {
  modelId?: string;
  provider?: "anthropic" | "google" | "openai";
  status?: "active" | "archived" | "draft";
  threadId?: string;
}

function renderThread(options: RenderThreadOptions = {}) {
  return {
    user: userEvent.setup(),
    ...renderWithQueryClient(
      <ChatThread
        modelId={options.modelId ?? "gpt-5-nano"}
        provider={options.provider ?? "openai"}
        status={options.status ?? "active"}
        threadId={options.threadId ?? "thread-1"}
      />
    ),
  };
}

describe("ChatThread", () => {
  beforeEach(() => {
    threadMessagesData = createThreadMessagesResult();
    streamMessages = [];
    activateDraftMutationHookMock.mockReset();
    sendMessageMutationHookMock.mockReset();
    updateModelMutationHookMock.mockReset();
    consumeDraftThreadIdMock.mockReset();
    useApiKeySettingsMock.mockReset();
    useApiKeySettingsMock.mockReturnValue({
      configuredProviders: createConfiguredProviders({
        anthropic: true,
        google: true,
        openai: true,
      }),
      openSettings: vi.fn(),
    });
    activateDraftMutationHookMock.mockReturnValue(createMutationResult());
    sendMessageMutationHookMock.mockReturnValue(createMutationResult());
    updateModelMutationHookMock.mockReturnValue(createMutationResult());
  });

  it("submits a draft thread with a derived title", async () => {
    const mutateAsync = vi.fn(async () => undefined);
    activateDraftMutationHookMock.mockReturnValue(
      createMutationResult({
        mutateAsync,
      })
    );
    const { user } = renderThread({
      status: "draft",
      threadId: "draft-1",
    });

    await user.type(
      await screen.findByPlaceholderText("Type your message here..."),
      " \nFirst line\nSecond line"
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(mutateAsync).toHaveBeenCalledWith({
      modelId: "gpt-5-nano",
      prompt: "First line\nSecond line",
      provider: "openai",
      threadId: "draft-1",
      title: "First line",
    });
  });

  it("consumes the warmed draft id after a successful draft submit", async () => {
    const mutateAsync = vi.fn(async () => undefined);
    activateDraftMutationHookMock.mockReturnValue(
      createMutationResult({
        mutateAsync,
      })
    );
    const { user } = renderThread({
      status: "draft",
      threadId: "draft-1",
    });

    await user.type(
      await screen.findByPlaceholderText("Type your message here..."),
      "Start this chat"
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => {
      expect(consumeDraftThreadIdMock).toHaveBeenCalledWith("draft-1");
    });
  });

  it("submits a message to an active thread with prompt and thread id", async () => {
    const mutateAsync = vi.fn(async () => undefined);
    sendMessageMutationHookMock.mockReturnValue(
      createMutationResult({
        mutateAsync,
      })
    );
    const { user } = renderThread({
      status: "active",
      threadId: "thread-7",
    });

    await user.type(
      await screen.findByPlaceholderText("Type your message here..."),
      "Follow-up question"
    );
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(mutateAsync).toHaveBeenCalledWith({
      prompt: "Follow-up question",
      threadId: "thread-7",
    });
  });

  it("does not update the model when the selection is unchanged", async () => {
    const mutateAsync = vi.fn(async () => undefined);
    updateModelMutationHookMock.mockReturnValue(
      createMutationResult({
        mutateAsync,
      })
    );
    const { user } = renderThread();

    await user.click(
      await screen.findByRole("button", { name: "Keep current model" })
    );

    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("updates the thread model when the selection changes", async () => {
    const mutateAsync = vi.fn(async () => undefined);
    updateModelMutationHookMock.mockReturnValue(
      createMutationResult({
        mutateAsync,
      })
    );
    const { user } = renderThread({
      threadId: "thread-9",
    });

    await user.click(
      await screen.findByRole("button", { name: "Switch to Claude" })
    );

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        modelId: "claude-opus-4-6",
        provider: "anthropic",
        threadId: "thread-9",
      });
    });
  });

  it("shows the typing indicator while awaiting an assistant reply", async () => {
    threadMessagesData = createThreadMessagesResult({
      page: [createThreadMessage({ order: 0, role: "user", text: "Hello" })],
    });

    renderThread();

    expect(await screen.findByText("Assistant is typing")).toBeVisible();
  });

  it("suppresses the typing indicator when an assistant reply already exists", async () => {
    threadMessagesData = createThreadMessagesResult({
      page: [
        createThreadMessage({ order: 0, role: "user", text: "Hello" }),
        createThreadMessage({
          order: 1,
          role: "assistant",
          text: "Hi there",
        }),
      ],
    });

    renderThread();

    await screen.findByText("Hi there");

    expect(screen.queryByText("Assistant is typing")).not.toBeInTheDocument();
  });

  it("renders deduped user and assistant messages in order", async () => {
    threadMessagesData = createThreadMessagesResult({
      page: [
        createThreadMessage({ order: 0, role: "user", text: "Hello" }),
        createThreadMessage({
          order: 1,
          parts: [],
          role: "assistant",
          status: "pending",
          text: "",
        }),
      ],
    });
    streamMessages = [
      createThreadMessage({
        order: 1,
        role: "assistant",
        status: "streaming",
        text: "Hi there",
      }) as UIMessage,
    ];

    const { container } = renderThread();

    await screen.findByText("Hello");
    await screen.findByText("Hi there");

    expect(container.textContent?.indexOf("Hello")).toBeLessThan(
      container.textContent?.indexOf("Hi there") ?? Number.POSITIVE_INFINITY
    );
    expect(screen.getAllByText("Hi there")).toHaveLength(1);
  });
});
