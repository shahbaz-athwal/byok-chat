import { queryOptions } from "@tanstack/react-query";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { ThreadListResult } from "@/lib/thread-drafts";
import { createConfiguredProviders, createThreadListItem } from "@/test/mocks";
import { renderWithQueryClient } from "@/test/render";
import { AppSidebar } from "./app-sidebar";

let threadsData: ThreadListResult = [];
const navigateMock = vi.fn();
const openSettingsMock = vi.fn();
const useParamsMock = vi.fn();
const useSessionMock = vi.fn();
const useApiKeySettingsMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    className,
    params: _params,
    preload: _preload,
    to: _to,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
    params?: unknown;
    preload?: unknown;
    to?: unknown;
  }) => (
    <a className={className} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
  useParams: () => useParamsMock(),
}));

vi.mock("@/queries/threads", () => ({
  threadsListQuery: () =>
    queryOptions({
      queryFn: async () => threadsData,
      queryKey: ["threads"],
    }),
}));

vi.mock("@/components/api-key-settings-provider", () => ({
  useApiKeySettings: () => useApiKeySettingsMock(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => useSessionMock(),
  },
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <div>Theme Toggle</div>,
}));

function renderSidebar() {
  return {
    user: userEvent.setup(),
    ...renderWithQueryClient(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    ),
  };
}

describe("AppSidebar", () => {
  beforeEach(() => {
    threadsData = [];
    navigateMock.mockReset();
    openSettingsMock.mockReset();
    useParamsMock.mockReset();
    useSessionMock.mockReset();
    useApiKeySettingsMock.mockReset();
    useApiKeySettingsMock.mockReturnValue({
      configuredProviders: createConfiguredProviders({ openai: true }),
      openSettings: openSettingsMock,
    });
    useParamsMock.mockReturnValue({});
    useSessionMock.mockReturnValue({
      data: null,
    });
  });

  it("renders the empty state when there are no chats", async () => {
    renderSidebar();

    expect(await screen.findByText("No chats yet")).toBeVisible();
    expect(
      screen.getByText("Start a new conversation to see it here.")
    ).toBeVisible();
  });

  it("marks the active thread from the route params", async () => {
    threadsData = [
      createThreadListItem({ threadId: "thread-1", title: "First chat" }),
      createThreadListItem({ threadId: "thread-2", title: "Second chat" }),
    ];
    useParamsMock.mockReturnValue({ threadId: "thread-2" });

    renderSidebar();

    const activeLabel = await screen.findByText("Second chat");
    const activeButton = activeLabel.closest("a");

    expect(activeButton).toHaveAttribute("data-active", "");
  });

  it('renders "Untitled chat" for chats without a title', async () => {
    threadsData = [
      createThreadListItem({ threadId: "thread-1", title: undefined }),
    ];

    renderSidebar();

    expect(await screen.findByText("Untitled chat")).toBeVisible();
  });

  it("navigates home when New Chat is clicked", async () => {
    const { user } = renderSidebar();

    await screen.findByRole("button", { name: "New Chat" });
    await user.click(screen.getByRole("button", { name: "New Chat" }));

    expect(navigateMock).toHaveBeenCalledWith({ to: "/" });
  });

  it("opens API key settings from the footer button", async () => {
    const { user } = renderSidebar();

    await screen.findByRole("button", { name: "API Keys" });
    await user.click(screen.getByRole("button", { name: "API Keys" }));

    expect(openSettingsMock).toHaveBeenCalledTimes(1);
  });

  it("shows authenticated user initials, name, and email in the footer", async () => {
    useSessionMock.mockReturnValue({
      data: {
        user: {
          email: "ada@example.com",
          name: "Ada Lovelace",
        },
      },
    });

    renderSidebar();

    await waitFor(() => {
      expect(screen.getByText("AL")).toBeVisible();
    });
    expect(screen.getByText("Ada Lovelace")).toBeVisible();
    expect(screen.getByText("ada@example.com")).toBeVisible();
  });

  it("omits the footer user when unauthenticated", () => {
    renderSidebar();

    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("AL")).not.toBeInTheDocument();
  });
});
