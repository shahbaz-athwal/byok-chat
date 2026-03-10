import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import {
  countScheduledFunctions,
  createActiveThread,
  createAuthenticatedActor,
  createTestConvex,
} from "./test-helpers";

describe("messages", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("rejects sending to a draft thread", async () => {
    const t = createTestConvex();
    const actor = await createAuthenticatedActor(t);
    const draft = await actor.client.mutation(api.threads.ensureDraft, {});

    await expect(
      actor.client.mutation(api.messages.send, {
        prompt: "Hello from draft",
        threadId: draft.threadId,
      })
    ).rejects.toThrowError("Draft threads must be activated before sending");
  });

  it("rejects cross-user access", async () => {
    const t = createTestConvex();
    const alice = await createAuthenticatedActor(t, { name: "Alice" });
    const bob = await createAuthenticatedActor(t, { name: "Bob" });
    const threadId = await createActiveThread(t, alice);

    await expect(
      bob.client.mutation(api.messages.send, {
        prompt: "Intrude on Alice",
        threadId,
      })
    ).rejects.toThrowError("Thread not found");
  });

  it("schedules one new generation when sending to an active thread", async () => {
    const t = createTestConvex();
    const actor = await createAuthenticatedActor(t);
    const threadId = await createActiveThread(t, actor);

    const before = await countScheduledFunctions(t);
    await actor.client.mutation(api.messages.send, {
      prompt: "Follow up",
      threadId,
    });
    const after = await countScheduledFunctions(t);

    expect(after).toBe(before + 1);
  });
});
