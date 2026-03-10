import type { UIMessage } from "@convex-dev/agent/react";
import {
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_PROVIDER,
  type Provider,
} from "@shared/chat-models";
import { vi } from "vitest";
import type { ThreadMessagesResult, ThreadRecord } from "@/lib/thread-drafts";
import type { ApiKeysListQueryData } from "@/queries/api-keys";

export interface ConfiguredProvidersState {
  anthropic: boolean;
  google: boolean;
  openai: boolean;
}

export interface ApiKeyEntryOverrides {
  maskedKey?: string;
  models?: readonly string[];
  provider?: Provider;
}

export interface ThreadListItemOverrides {
  _creationTime?: number;
  _id?: ThreadRecord["_id"];
  modelId?: string;
  provider?: Provider;
  status?: ThreadRecord["status"];
  threadId?: string;
  title?: ThreadRecord["title"];
  userId?: string;
}

export interface ThreadMessageOverrides {
  _creationTime?: number;
  id?: ThreadMessagesResult["page"][number]["id"];
  key?: string;
  order?: number;
  parts?: ThreadMessagesResult["page"][number]["parts"];
  role?: ThreadMessagesResult["page"][number]["role"];
  status?: ThreadMessagesResult["page"][number]["status"];
  stepOrder?: number;
  text?: string;
}

export interface ThreadMessagesResultOverrides {
  page?: ThreadMessagesResult["page"];
}

export interface MutationResultOptions<TVariables, TResult> {
  isPending?: boolean;
  mutateAsync?: (variables: TVariables) => Promise<TResult>;
  variables?: TVariables;
}

export function createConfiguredProviders(
  overrides: Partial<ConfiguredProvidersState> = {}
): ConfiguredProvidersState {
  return {
    anthropic: false,
    google: false,
    openai: false,
    ...overrides,
  };
}

export function createApiKeyEntry(
  overrides: ApiKeyEntryOverrides = {}
): ApiKeysListQueryData[number] {
  const provider = overrides.provider ?? DEFAULT_PROVIDER;

  return {
    maskedKey: overrides.maskedKey ?? `${provider}-key`,
    models: overrides.models
      ? [...overrides.models]
      : [DEFAULT_MODEL_BY_PROVIDER[provider]],
    provider,
  };
}

export function createThreadListItem(
  overrides: ThreadListItemOverrides = {}
): ThreadRecord {
  const provider = overrides.provider ?? DEFAULT_PROVIDER;
  const threadId = overrides.threadId ?? "thread-1";

  return {
    _creationTime: overrides._creationTime ?? 1,
    _id: overrides._id ?? (`thread-record-${threadId}` as ThreadRecord["_id"]),
    modelId: overrides.modelId ?? DEFAULT_MODEL_BY_PROVIDER[provider],
    provider,
    status: overrides.status ?? "active",
    threadId,
    title: "title" in overrides ? overrides.title : "Thread title",
    userId: overrides.userId ?? "user-1",
  };
}

export function createThreadMessage(
  overrides: ThreadMessageOverrides = {}
): ThreadMessagesResult["page"][number] {
  const order = overrides.order ?? 0;
  const text = overrides.text ?? `Message ${order}`;

  return {
    _creationTime: overrides._creationTime ?? order + 1,
    id:
      overrides.id ??
      (`message-${order}-${overrides.stepOrder ?? 0}` as ThreadMessagesResult["page"][number]["id"]),
    key: overrides.key ?? `message-key-${order}-${overrides.stepOrder ?? 0}`,
    order,
    parts: overrides.parts ?? [{ text, type: "text" }],
    role: overrides.role ?? "user",
    status: overrides.status ?? ("success" as UIMessage["status"]),
    stepOrder: overrides.stepOrder ?? 0,
    text,
  };
}

export function createThreadMessagesResult(
  overrides: ThreadMessagesResultOverrides = {}
): ThreadMessagesResult {
  return {
    continueCursor: "",
    isDone: true,
    page: overrides.page ?? [],
    pageStatus: null,
    splitCursor: null,
    streams: {
      kind: "list",
      messages: [],
    },
  };
}

export function createMutationResult<TVariables, TResult>(
  options: MutationResultOptions<TVariables, TResult> = {}
) {
  return {
    isPending: options.isPending ?? false,
    mutateAsync: vi.fn(
      options.mutateAsync ?? (async () => undefined as TResult)
    ),
    variables: options.variables,
  };
}
