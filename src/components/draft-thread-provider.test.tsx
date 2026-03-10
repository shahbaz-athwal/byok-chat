import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraftThreadProvider, useDraftThread } from "./draft-thread-provider";

const useEnsureDraftMutationMock = vi.fn();

vi.mock("@/mutations/thread", () => ({
  useEnsureDraftMutation: () => useEnsureDraftMutationMock(),
}));

interface Deferred<T> {
  promise: Promise<T>;
  reject: (error: unknown) => void;
  resolve: (value: T) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, reject, resolve };
}

function TestConsumer() {
  const { consumeDraftThreadId, draftThreadId, ensureDraftThreadId } =
    useDraftThread();
  const [ensureResult, setEnsureResult] = useState("");

  return (
    <div>
      <div data-testid="draft-thread-id">{draftThreadId ?? "none"}</div>
      <div data-testid="ensure-result">{ensureResult || "none"}</div>
      <button
        onClick={async () => {
          setEnsureResult(await ensureDraftThreadId());
        }}
        type="button"
      >
        Ensure once
      </button>
      <button
        onClick={async () => {
          const results = await Promise.all([
            ensureDraftThreadId(),
            ensureDraftThreadId(),
          ]);
          setEnsureResult(results.join(","));
        }}
        type="button"
      >
        Ensure twice
      </button>
      <button
        onClick={() => {
          if (draftThreadId) {
            consumeDraftThreadId(draftThreadId);
          }
        }}
        type="button"
      >
        Consume current
      </button>
      <button
        onClick={() => {
          consumeDraftThreadId("other-thread");
        }}
        type="button"
      >
        Consume other
      </button>
    </div>
  );
}

function renderProvider(children: ReactNode = <TestConsumer />) {
  render(<DraftThreadProvider>{children}</DraftThreadProvider>);
  return userEvent.setup();
}

describe("DraftThreadProvider", () => {
  beforeEach(() => {
    useEnsureDraftMutationMock.mockReset();
  });

  it("warms a draft on mount", async () => {
    const mutateAsync = vi.fn(async () => ({ threadId: "draft-1" }));

    useEnsureDraftMutationMock.mockReturnValue({
      mutateAsync,
    });

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("draft-thread-id")).toHaveTextContent(
        "draft-1"
      );
    });
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({});
  });

  it("reuses one in-flight promise across repeated ensure calls", async () => {
    const deferred = createDeferred<{ threadId: string }>();
    const mutateAsync = vi.fn(() => deferred.promise);

    useEnsureDraftMutationMock.mockReturnValue({
      mutateAsync,
    });

    const user = renderProvider();

    await user.click(screen.getByRole("button", { name: "Ensure twice" }));
    deferred.resolve({ threadId: "draft-1" });

    await waitFor(() => {
      expect(screen.getByTestId("ensure-result")).toHaveTextContent(
        "draft-1,draft-1"
      );
    });
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("returns the cached draft id after success", async () => {
    const mutateAsync = vi.fn(async () => ({ threadId: "draft-1" }));

    useEnsureDraftMutationMock.mockReturnValue({
      mutateAsync,
    });

    const user = renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("draft-thread-id")).toHaveTextContent(
        "draft-1"
      );
    });

    await user.click(screen.getByRole("button", { name: "Ensure once" }));

    await waitFor(() => {
      expect(screen.getByTestId("ensure-result")).toHaveTextContent("draft-1");
    });
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("clears the matching draft id and warms the next one when consumed", async () => {
    const nextDraft = createDeferred<{ threadId: string }>();
    const mutateAsync = vi
      .fn<() => Promise<{ threadId: string }>>()
      .mockResolvedValueOnce({ threadId: "draft-1" })
      .mockImplementationOnce(() => nextDraft.promise);

    useEnsureDraftMutationMock.mockReturnValue({
      mutateAsync,
    });

    const user = renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("draft-thread-id")).toHaveTextContent(
        "draft-1"
      );
    });

    await user.click(screen.getByRole("button", { name: "Consume current" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(2);
    });

    nextDraft.resolve({ threadId: "draft-2" });

    await waitFor(() => {
      expect(screen.getByTestId("draft-thread-id")).toHaveTextContent(
        "draft-2"
      );
    });
  });

  it("ignores consume calls for a non-matching draft id", async () => {
    const mutateAsync = vi.fn(async () => ({ threadId: "draft-1" }));

    useEnsureDraftMutationMock.mockReturnValue({
      mutateAsync,
    });

    const user = renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("draft-thread-id")).toHaveTextContent(
        "draft-1"
      );
    });

    await user.click(screen.getByRole("button", { name: "Consume other" }));

    expect(screen.getByTestId("draft-thread-id")).toHaveTextContent("draft-1");
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it("resets cached state after a failed warm-up", async () => {
    const mutateAsync = vi
      .fn<() => Promise<{ threadId: string }>>()
      .mockRejectedValueOnce(new Error("warm failed"))
      .mockResolvedValueOnce({ threadId: "draft-2" });

    useEnsureDraftMutationMock.mockReturnValue({
      mutateAsync,
    });

    const user = renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("draft-thread-id")).toHaveTextContent("none");
    });

    await user.click(screen.getByRole("button", { name: "Ensure once" }));

    await waitFor(() => {
      expect(screen.getByTestId("ensure-result")).toHaveTextContent("draft-2");
    });
    expect(mutateAsync).toHaveBeenCalledTimes(2);
  });
});
