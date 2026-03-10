import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER,
} from "../shared/chat-models";
import { api } from "./_generated/api";
import {
  countScheduledFunctions,
  createActiveThread,
  createAuthenticatedActor,
  createTestConvex,
  getThreadConfig,
  listThreadConfigsForUser,
} from "./test-helpers";

describe("threads", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("creates one draft with the default provider and model", async () => {
    const t = createTestConvex();
    const actor = await createAuthenticatedActor(t);

    const result = await actor.client.mutation(api.threads.ensureDraft, {});
    const thread = await getThreadConfig(t, result.threadId);

    expect(thread).toMatchObject({
      modelId: DEFAULT_MODEL_BY_PROVIDER[DEFAULT_PROVIDER],
      provider: DEFAULT_PROVIDER,
      status: "draft",
      userId: actor.userId,
    });
  });

  it("returns the same draft on repeated ensureDraft calls", async () => {
    const t = createTestConvex();
    const actor = await createAuthenticatedActor(t);

    const first = await actor.client.mutation(api.threads.ensureDraft, {});
    const second = await actor.client.mutation(api.threads.ensureDraft, {});
    const threads = await listThreadConfigsForUser(t, actor.userId);

    expect(second.threadId).toBe(first.threadId);
    expect(threads).toHaveLength(1);
  });

  it("returns owned threads and rejects cross-user access", async () => {
    const t = createTestConvex();
    const alice = await createAuthenticatedActor(t, { name: "Alice" });
    const bob = await createAuthenticatedActor(t, { name: "Bob" });
    const threadId = await createActiveThread(t, alice);

    const thread = await alice.client.query(api.threads.get, { threadId });
    expect(thread.threadId).toBe(threadId);

    await expect(
      bob.client.query(api.threads.get, { threadId })
    ).rejects.toThrowError("Thread not found");
  });

  it("activates a draft, stores model settings, lists the thread, and schedules generation", async () => {
    const t = createTestConvex();
    const actor = await createAuthenticatedActor(t);
    const draft = await actor.client.mutation(api.threads.ensureDraft, {});

    const before = await countScheduledFunctions(t);
    await actor.client.mutation(api.threads.activateDraftAndSend, {
      modelId: "gpt-5-mini",
      prompt: "Summarize the plan",
      provider: "openai",
      threadId: draft.threadId,
      title: "Planning thread",
    });

    const after = await countScheduledFunctions(t);
    const thread = await getThreadConfig(t, draft.threadId);
    const list = await actor.client.query(api.threads.list, {});

    expect(after).toBe(before + 1);
    expect(thread).toMatchObject({
      modelId: "gpt-5-mini",
      provider: "openai",
      status: "active",
      title: "Planning thread",
    });
    expect(list).toHaveLength(1);
    expect(list[0]?.threadId).toBe(draft.threadId);
  });

  it("rejects invalid model-provider combinations during activation", async () => {
    const t = createTestConvex();
    const actor = await createAuthenticatedActor(t);
    const draft = await actor.client.mutation(api.threads.ensureDraft, {});

    await expect(
      actor.client.mutation(api.threads.activateDraftAndSend, {
        modelId: "gemini-3.1-pro-preview",
        prompt: "Start",
        provider: "openai",
        threadId: draft.threadId,
        title: "Invalid",
      })
    ).rejects.toThrowError('Unsupported model "gemini-3.1-pro-preview"');

    const thread = await getThreadConfig(t, draft.threadId);
    expect(thread?.status).toBe("draft");
  });

  it("updates the stored title", async () => {
    const t = createTestConvex();
    const actor = await createAuthenticatedActor(t);
    const threadId = await createActiveThread(t, actor, { title: "Before" });

    await actor.client.mutation(api.threads.updateTitle, {
      threadId,
      title: "After",
    });

    const thread = await getThreadConfig(t, threadId);
    expect(thread?.title).toBe("After");
  });

  it("updates the stored provider and model and rejects invalid updates", async () => {
    const t = createTestConvex();
    const actor = await createAuthenticatedActor(t);
    const threadId = await createActiveThread(t, actor);

    await actor.client.mutation(api.threads.updateModel, {
      modelId: "claude-haiku-4-5",
      provider: "anthropic",
      threadId,
    });

    let thread = await getThreadConfig(t, threadId);
    expect(thread).toMatchObject({
      modelId: "claude-haiku-4-5",
      provider: "anthropic",
    });

    await expect(
      actor.client.mutation(api.threads.updateModel, {
        modelId: "gpt-5-mini",
        provider: "google",
        threadId,
      })
    ).rejects.toThrowError('Unsupported model "gpt-5-mini"');

    thread = await getThreadConfig(t, threadId);
    expect(thread).toMatchObject({
      modelId: "claude-haiku-4-5",
      provider: "anthropic",
    });
  });

  it("removes a thread and it can no longer be fetched", async () => {
    const t = createTestConvex();
    const actor = await createAuthenticatedActor(t);
    const threadId = await createActiveThread(t, actor);

    await actor.client.mutation(api.threads.remove, { threadId });

    expect(await getThreadConfig(t, threadId)).toBeNull();
    await expect(
      actor.client.query(api.threads.get, { threadId })
    ).rejects.toThrowError("Can't find a document in threadConfig");
  });
});
