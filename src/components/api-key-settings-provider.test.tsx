import { queryOptions } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiKeysListQueryData } from "@/queries/api-keys";
import { createApiKeyEntry } from "@/test/mocks";
import { renderWithQueryClient } from "@/test/render";
import {
  ApiKeySettingsProvider,
  useApiKeySettings,
} from "./api-key-settings-provider";

let apiKeysListData: ApiKeysListQueryData = [];
const { toastAddMock } = vi.hoisted(() => ({
  toastAddMock: vi.fn(),
}));
const saveMutationHookMock = vi.fn();
const removeMutationHookMock = vi.fn();

vi.mock("@/queries/api-keys", () => ({
  apiKeysListQuery: () =>
    queryOptions({
      queryFn: async () => apiKeysListData,
      queryKey: ["api-keys"],
    }),
}));

vi.mock("@/mutations/api-keys", () => ({
  useRemoveApiKeyMutation: () => removeMutationHookMock(),
  useSaveApiKeyMutation: () => saveMutationHookMock(),
}));

vi.mock("@/components/ui/toast", () => ({
  toastManager: {
    add: toastAddMock,
  },
}));

function TestConsumer({ children }: { children?: ReactNode }) {
  const { configuredProviders, openSettings } = useApiKeySettings();

  return (
    <div>
      <output data-testid="configured-providers">
        {JSON.stringify(configuredProviders)}
      </output>
      <button onClick={openSettings} type="button">
        Open API key settings
      </button>
      {children}
    </div>
  );
}

function renderProvider() {
  return {
    user: userEvent.setup(),
    ...renderWithQueryClient(
      <ApiKeySettingsProvider>
        <TestConsumer />
      </ApiKeySettingsProvider>
    ),
  };
}

function getProviderCard(label: string) {
  const title = screen.getByText(label);
  const card = title.closest("[data-slot='card']");

  if (!(card instanceof HTMLElement)) {
    throw new Error(`Card not found for provider ${label}`);
  }

  return card;
}

describe("ApiKeySettingsProvider", () => {
  beforeEach(() => {
    apiKeysListData = [];
    toastAddMock.mockReset();
    saveMutationHookMock.mockReset();
    removeMutationHookMock.mockReset();
    saveMutationHookMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(async () => undefined),
      variables: undefined,
    });
    removeMutationHookMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(async () => undefined),
      variables: undefined,
    });
  });

  it("exposes configuredProviders from the query data", async () => {
    apiKeysListData = [
      createApiKeyEntry({ provider: "openai" }),
      createApiKeyEntry({ provider: "anthropic" }),
    ];

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("configured-providers")).toHaveTextContent(
        JSON.stringify({
          anthropic: true,
          google: false,
          openai: true,
        })
      );
    });
  });

  it("opens the settings sheet when openSettings is called", async () => {
    const { user } = renderProvider();

    await user.click(
      screen.getByRole("button", { name: "Open API key settings" })
    );

    expect(await screen.findByText("API Keys")).toBeVisible();
  });

  it("saves a trimmed key and shows a success toast", async () => {
    const mutateAsync = vi.fn(async () => undefined);
    saveMutationHookMock.mockReturnValue({
      isPending: false,
      mutateAsync,
      variables: undefined,
    });

    const { user } = renderProvider();

    await user.click(
      screen.getByRole("button", { name: "Open API key settings" })
    );

    const openAiCard = getProviderCard("OpenAI");

    await user.type(
      within(openAiCard).getByLabelText("API Key"),
      "  sk-openai  "
    );
    await user.click(within(openAiCard).getByRole("button", { name: "Save" }));

    expect(mutateAsync).toHaveBeenCalledWith({
      apiKey: "sk-openai",
      provider: "openai",
    });
    expect(toastAddMock).toHaveBeenCalledWith({
      title: "OpenAI key saved",
      type: "success",
    });
  });

  it("removes a configured key and shows a success toast", async () => {
    apiKeysListData = [createApiKeyEntry({ provider: "anthropic" })];
    const mutateAsync = vi.fn(async () => undefined);
    removeMutationHookMock.mockReturnValue({
      isPending: false,
      mutateAsync,
      variables: undefined,
    });

    const { user } = renderProvider();

    await user.click(
      screen.getByRole("button", { name: "Open API key settings" })
    );

    const anthropicCard = getProviderCard("Anthropic");

    await user.click(
      within(anthropicCard).getByRole("button", { name: "Remove" })
    );

    expect(mutateAsync).toHaveBeenCalledWith({
      provider: "anthropic",
    });
    expect(toastAddMock).toHaveBeenCalledWith({
      title: "Anthropic key removed",
      type: "success",
    });
  });

  it("disables save for blank input and remove for unconfigured providers", async () => {
    const { user } = renderProvider();

    await user.click(
      screen.getByRole("button", { name: "Open API key settings" })
    );

    const googleCard = getProviderCard("Google");

    expect(
      within(googleCard).getByRole("button", { name: "Save" })
    ).toBeDisabled();
    expect(
      within(googleCard).getByRole("button", { name: "Remove" })
    ).toBeDisabled();
  });

  it("disables controls only for the matching provider while pending", async () => {
    apiKeysListData = [
      createApiKeyEntry({ provider: "openai" }),
      createApiKeyEntry({ provider: "anthropic" }),
    ];
    saveMutationHookMock.mockReturnValue({
      isPending: true,
      mutateAsync: vi.fn(async () => undefined),
      variables: { provider: "openai" },
    });

    const { user } = renderProvider();

    await user.click(
      screen.getByRole("button", { name: "Open API key settings" })
    );

    const openAiCard = getProviderCard("OpenAI");
    const anthropicCard = getProviderCard("Anthropic");

    expect(within(openAiCard).getByLabelText("API Key")).toBeDisabled();
    expect(
      within(openAiCard).getByRole("button", { name: "Update" })
    ).toBeDisabled();
    expect(
      within(openAiCard).getByRole("button", { name: "Remove" })
    ).toBeDisabled();

    expect(within(anthropicCard).getByLabelText("API Key")).not.toBeDisabled();
    expect(
      within(anthropicCard).getByRole("button", { name: "Remove" })
    ).not.toBeDisabled();
  });
});
