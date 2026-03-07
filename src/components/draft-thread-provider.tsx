import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { useEnsureDraftMutation } from "@/mutations/thread";

export interface DraftThreadContextValue {
  consumeDraftThreadId: (threadId: string) => void;
  draftThreadId: string | null;
  ensureDraftThreadId: () => Promise<string>;
}

const DraftThreadContext = createContext<DraftThreadContextValue | null>(null);

export function DraftThreadProvider({ children }: { children: ReactNode }) {
  const ensureDraftMutation = useEnsureDraftMutation({ showErrorToast: false });
  const [draftThreadId, setDraftThreadId] = useState<string | null>(null);
  const draftThreadIdRef = useRef<string | null>(null);
  const warmDraftPromiseRef = useRef<Promise<string> | null>(null);

  async function ensureDraftThreadId() {
    if (draftThreadIdRef.current) {
      return draftThreadIdRef.current;
    }

    if (warmDraftPromiseRef.current) {
      return await warmDraftPromiseRef.current;
    }

    const promise = ensureDraftMutation
      .mutateAsync({})
      .then(({ threadId }) => {
        draftThreadIdRef.current = threadId;
        setDraftThreadId(threadId);
        return threadId;
      })
      .finally(() => {
        warmDraftPromiseRef.current = null;
      });

    warmDraftPromiseRef.current = promise;
    return await promise;
  }

  const warmNextDraft = useEffectEvent(() => {
    ensureDraftThreadId().catch(() => {
      draftThreadIdRef.current = null;
      setDraftThreadId(null);
    });
  });

  function consumeDraftThreadId(threadId: string) {
    if (draftThreadIdRef.current !== threadId) {
      return;
    }

    draftThreadIdRef.current = null;
    setDraftThreadId(null);
    warmNextDraft();
  }

  useEffect(() => {
    warmNextDraft();
  }, []);

  return (
    <DraftThreadContext
      value={{ draftThreadId, ensureDraftThreadId, consumeDraftThreadId }}
    >
      {children}
    </DraftThreadContext>
  );
}

export function useDraftThread() {
  const context = useContext(DraftThreadContext);

  if (!context) {
    throw new Error("useDraftThread must be used within DraftThreadProvider.");
  }

  return context;
}
