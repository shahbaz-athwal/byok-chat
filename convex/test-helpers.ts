import type { TestConvex, TestConvexForDataModel } from "convex-test";
import { convexTest } from "convex-test";
import agentSchema from "../node_modules/@convex-dev/agent/dist/component/schema.js";
import {
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER,
} from "../shared/chat-models";
import { api, components } from "./_generated/api";
import type { DataModel, Doc } from "./_generated/dataModel";
import betterAuthSchema from "./betterAuth/schema";
import schema from "./schema";
import { agentModules, betterAuthModules, modules } from "./test.setup";

interface AuthenticatedActor {
  client: TestConvexForDataModel<DataModel>;
  email: string;
  name: string;
  sessionId: string;
  userId: string;
}

interface CreateActorOptions {
  email?: string;
  name?: string;
}

interface CreateActiveThreadOptions {
  modelId?: string;
  prompt?: string;
  provider?: "anthropic" | "google" | "openai";
  title?: string;
}

let seedCounter = 0;

function nextSeed(prefix: string) {
  seedCounter += 1;
  return `${prefix}-${seedCounter}`;
}

function registerComponents(t: TestConvex<typeof schema>) {
  t.registerComponent("betterAuth", betterAuthSchema, betterAuthModules);
  t.registerComponent("agent", agentSchema, agentModules);
  return t;
}

export function createTestConvex() {
  return registerComponents(convexTest(schema, modules));
}

export async function createAuthenticatedActor(
  t: TestConvex<typeof schema>,
  options: CreateActorOptions = {}
): Promise<AuthenticatedActor> {
  const seed = nextSeed("user");
  const now = Date.now();
  const name = options.name ?? `Test User ${seed}`;
  const email = options.email ?? `${seed}@example.com`;

  const user = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "user",
      data: {
        createdAt: now,
        email,
        emailVerified: true,
        name,
        updatedAt: now,
      },
    },
  });

  const session = await t.mutation(components.betterAuth.adapter.create, {
    input: {
      model: "session",
      data: {
        createdAt: now,
        expiresAt: now + 60_000,
        token: `session-token-${seed}`,
        updatedAt: now,
        userId: user._id,
      },
    },
  });

  return {
    client: t.withIdentity({
      email,
      issuer: "https://convex.test",
      name,
      sessionId: session._id,
      subject: user._id,
    }),
    email,
    name,
    sessionId: session._id,
    userId: user._id,
  };
}

export async function createActiveThread(
  _t: TestConvex<typeof schema>,
  actor: AuthenticatedActor,
  options: CreateActiveThreadOptions = {}
) {
  const draft = await actor.client.mutation(api.threads.ensureDraft, {});
  const provider = options.provider ?? DEFAULT_PROVIDER;
  const modelId = options.modelId ?? DEFAULT_MODEL_BY_PROVIDER[provider];

  await actor.client.mutation(api.threads.activateDraftAndSend, {
    modelId,
    prompt: options.prompt ?? "Start the conversation",
    provider,
    threadId: draft.threadId,
    title: options.title ?? "Active thread",
  });

  return draft.threadId;
}

export async function getThreadConfig(
  t: TestConvex<typeof schema>,
  threadId: string
) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("threadConfig")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .unique();
  });
}

export async function listThreadConfigsForUser(
  t: TestConvex<typeof schema>,
  userId: string
) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("threadConfig")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  });
}

export async function countScheduledFunctions(t: TestConvex<typeof schema>) {
  return await t.run(async (ctx) => {
    const jobs = await ctx.db.system.query("_scheduled_functions").collect();
    return jobs.length;
  });
}

export async function listApiKeyDocsForUser(
  t: TestConvex<typeof schema>,
  userId: string
) {
  return await t.run(async (ctx) => {
    return await ctx.db
      .query("apiKeys")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  });
}

export interface ThreadConfigDoc extends Doc<"threadConfig"> {}
