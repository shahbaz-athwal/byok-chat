import type { OptimisticLocalStore } from "convex/browser";
import { describe, expect, it } from "vitest";
import { getThreadMessagesQueryArgs } from "@/queries/messages";
import {
  createThreadListItem,
  createThreadMessage,
  createThreadMessagesResult,
} from "@/test/mocks";
import { api } from "../../convex/_generated/api";
import {
  applyActivateDraftOptimisticUpdate,
  applySendThreadMessageOptimisticUpdate,
  deriveThreadTitle,
} from "./thread-drafts";

interface StoredQueryValue {
  argsKey: string;
  queryKey: string;
  value: unknown;
}

class FakeOptimisticLocalStore {
  private readonly entries: StoredQueryValue[] = [];

  private getQueryKey(query: unknown) {
    return JSON.stringify(query);
  }

  getQuery(query: unknown, args: unknown) {
    return this.entries.find(
      (entry) =>
        entry.queryKey === this.getQueryKey(query) &&
        entry.argsKey === JSON.stringify(args)
    )?.value;
  }

  setQuery(query: unknown, args: unknown, value: unknown) {
    const argsKey = JSON.stringify(args);
    const existingEntry = this.entries.find(
      (entry) =>
        entry.queryKey === this.getQueryKey(query) && entry.argsKey === argsKey
    );

    if (existingEntry) {
      existingEntry.value = value;
      return;
    }

    this.entries.push({
      argsKey,
      queryKey: this.getQueryKey(query),
      value,
    });
  }
}

function createLocalStore() {
  return new FakeOptimisticLocalStore();
}

describe("deriveThreadTitle", () => {
  it("returns the first non-empty line", () => {
    expect(deriveThreadTitle("\n\nFirst line\nSecond line")).toBe("First line");
  });

  it("trims whitespace", () => {
    expect(deriveThreadTitle("   Hello world   \nAnother line")).toBe(
      "Hello world"
    );
  });

  it('falls back to "Untitled chat" when input is blank', () => {
    expect(deriveThreadTitle("  \n\t ")).toBe("Untitled chat");
  });

  it("truncates to 60 characters", () => {
    expect(deriveThreadTitle("a".repeat(80))).toBe("a".repeat(60));
  });
});

describe("optimistic thread draft updates", () => {
  it("inserts or updates the active thread and appends the optimistic user message", () => {
    const localStore = createLocalStore();
    const existingThread = createThreadListItem({
      modelId: "gpt-5-mini",
      provider: "openai",
      status: "draft",
      threadId: "draft-1",
      title: undefined,
    });
    const siblingThread = createThreadListItem({
      threadId: "thread-2",
      title: "Older thread",
    });
    const messagesArgs = getThreadMessagesQueryArgs("draft-1");

    localStore.setQuery(
      api.threads.get,
      { threadId: "draft-1" },
      existingThread
    );
    localStore.setQuery(api.threads.list, {}, [siblingThread, existingThread]);
    localStore.setQuery(
      api.messages.list,
      messagesArgs,
      createThreadMessagesResult({
        page: [createThreadMessage({ order: 0, text: "Earlier message" })],
      })
    );

    applyActivateDraftOptimisticUpdate(
      localStore as unknown as OptimisticLocalStore,
      {
        modelId: "claude-opus-4-6",
        prompt: "New message",
        provider: "anthropic",
        threadId: "draft-1",
        title: "New title",
      }
    );

    expect(
      localStore.getQuery(api.threads.get, { threadId: "draft-1" })
    ).toEqual(
      expect.objectContaining({
        modelId: "claude-opus-4-6",
        provider: "anthropic",
        status: "active",
        threadId: "draft-1",
        title: "New title",
      })
    );
    expect(localStore.getQuery(api.threads.list, {})).toEqual([
      expect.objectContaining({
        status: "active",
        threadId: "draft-1",
        title: "New title",
      }),
      siblingThread,
    ]);
    expect(localStore.getQuery(api.messages.list, messagesArgs)).toEqual(
      expect.objectContaining({
        page: [
          expect.objectContaining({
            order: 0,
            text: "Earlier message",
          }),
          expect.objectContaining({
            order: 1,
            role: "user",
            status: "pending",
            text: "New message",
          }),
        ],
      })
    );
  });

  it("appends only the optimistic user message for an active thread send", () => {
    const localStore = createLocalStore();
    const messagesArgs = getThreadMessagesQueryArgs("thread-1");

    localStore.setQuery(
      api.messages.list,
      messagesArgs,
      createThreadMessagesResult({
        page: [
          createThreadMessage({ order: 0, role: "user", text: "First" }),
          createThreadMessage({
            order: 1,
            role: "assistant",
            text: "Reply",
          }),
        ],
      })
    );

    applySendThreadMessageOptimisticUpdate(
      localStore as unknown as OptimisticLocalStore,
      {
        prompt: "Follow up",
        threadId: "thread-1",
      }
    );

    expect(localStore.getQuery(api.messages.list, messagesArgs)).toEqual(
      expect.objectContaining({
        page: [
          expect.objectContaining({ order: 0, text: "First" }),
          expect.objectContaining({ order: 1, text: "Reply" }),
          expect.objectContaining({
            order: 2,
            role: "user",
            status: "pending",
            text: "Follow up",
          }),
        ],
      })
    );
    expect(localStore.getQuery(api.threads.list, {})).toBeUndefined();
  });
});
