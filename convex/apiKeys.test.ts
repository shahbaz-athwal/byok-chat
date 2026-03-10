import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import {
  createAuthenticatedActor,
  createTestConvex,
  listApiKeyDocsForUser,
} from "./test-helpers";

describe("apiKeys", () => {
  it("saves a key and lists a masked version with provider models", async () => {
    const t = createTestConvex();
    const actor = await createAuthenticatedActor(t);

    await actor.client.mutation(api.apiKeys.save, {
      apiKey: "sk-live-1234567890",
      provider: "openai",
    });

    const keys = await actor.client.query(api.apiKeys.list, {});
    expect(keys).toEqual([
      {
        maskedKey: "sk-l••••7890",
        models: ["gpt-5.2", "gpt-5-mini", "gpt-5-nano"],
        provider: "openai",
      },
    ]);
  });

  it("updates an existing key instead of inserting a duplicate", async () => {
    const t = createTestConvex();
    const actor = await createAuthenticatedActor(t);

    await actor.client.mutation(api.apiKeys.save, {
      apiKey: "first-key-1234",
      provider: "openai",
    });
    await actor.client.mutation(api.apiKeys.save, {
      apiKey: "second-key-5678",
      provider: "openai",
    });

    const docs = await listApiKeyDocsForUser(t, actor.userId);
    expect(docs).toHaveLength(1);
    expect(docs[0]?.apiKey).toBe("second-key-5678");
  });

  it("lists keys only for the authenticated user", async () => {
    const t = createTestConvex();
    const alice = await createAuthenticatedActor(t, { name: "Alice" });
    const bob = await createAuthenticatedActor(t, { name: "Bob" });

    await alice.client.mutation(api.apiKeys.save, {
      apiKey: "alice-key-1234",
      provider: "openai",
    });
    await bob.client.mutation(api.apiKeys.save, {
      apiKey: "bob-key-5678",
      provider: "google",
    });

    const aliceKeys = await alice.client.query(api.apiKeys.list, {});
    expect(aliceKeys).toHaveLength(1);
    expect(aliceKeys[0]?.provider).toBe("openai");
  });

  it("removes only the caller key and is idempotent", async () => {
    const t = createTestConvex();
    const alice = await createAuthenticatedActor(t, { name: "Alice" });
    const bob = await createAuthenticatedActor(t, { name: "Bob" });

    await alice.client.mutation(api.apiKeys.save, {
      apiKey: "alice-key-1234",
      provider: "openai",
    });
    await bob.client.mutation(api.apiKeys.save, {
      apiKey: "bob-key-5678",
      provider: "openai",
    });

    await alice.client.mutation(api.apiKeys.remove, { provider: "openai" });
    await alice.client.mutation(api.apiKeys.remove, { provider: "openai" });

    expect(await listApiKeyDocsForUser(t, alice.userId)).toHaveLength(0);
    expect(await listApiKeyDocsForUser(t, bob.userId)).toHaveLength(1);
  });

  it("returns the raw key from the internal query", async () => {
    const t = createTestConvex();
    const actor = await createAuthenticatedActor(t);

    await actor.client.mutation(api.apiKeys.save, {
      apiKey: "secret-openai-key",
      provider: "openai",
    });

    const key = await t.query(internal.apiKeys.getKey, {
      provider: "openai",
      userId: actor.userId,
    });

    expect(key).toBe("secret-openai-key");
  });

  it("throws when a provider key is missing", async () => {
    const t = createTestConvex();

    await expect(
      t.query(internal.apiKeys.getKey, {
        provider: "anthropic",
        userId: "missing-user",
      })
    ).rejects.toThrowError('No API key configured for provider "anthropic"');
  });

  it("applies the short-key masking boundary", async () => {
    const t = createTestConvex();
    const actor = await createAuthenticatedActor(t);

    await actor.client.mutation(api.apiKeys.save, {
      apiKey: "abcd1234",
      provider: "google",
    });

    const keys = await actor.client.query(api.apiKeys.list, {});
    expect(keys[0]?.maskedKey).toHaveLength(8);
    expect(keys[0]?.maskedKey).not.toBe("abcd1234");
  });
});
