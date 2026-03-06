import type { Provider } from "@/lib/chat-models";

export interface ThreadSummary {
  _creationTime: number;
  modelId: string;
  provider: Provider;
  threadId: string;
  title?: string;
}

export interface ThreadListResult {
  continueCursor: string;
  isDone: boolean;
  page: ThreadSummary[];
  pageStatus?: "SplitRecommended" | "SplitRequired" | null;
  splitCursor?: string | null;
}
