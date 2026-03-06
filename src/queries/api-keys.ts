import { convexQuery } from "@convex-dev/react-query";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";

export const API_KEYS_LIST_ARGS: FunctionArgs<typeof api.apiKeys.list> = {};

export type ApiKeysListQueryData = FunctionReturnType<typeof api.apiKeys.list>;

export function apiKeysListQuery() {
  return convexQuery(api.apiKeys.list, API_KEYS_LIST_ARGS);
}
