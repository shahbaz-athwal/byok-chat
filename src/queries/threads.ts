import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";

export function threadsListQuery() {
  return convexQuery(api.threads.list, {});
}

export function threadGetQuery(threadId: string) {
  return convexQuery(api.threads.get, { threadId });
}
