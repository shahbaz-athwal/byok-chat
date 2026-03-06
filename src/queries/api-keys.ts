import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

export function apiKeysListQuery() {
  return convexQuery(api.apiKeys.list, {});
}
