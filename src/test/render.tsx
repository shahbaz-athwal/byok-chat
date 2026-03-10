import {
  QueryClient,
  type QueryClientConfig,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  type RenderOptions,
  type RenderResult,
  render,
} from "@testing-library/react";
import { type ReactElement, type ReactNode, Suspense } from "react";

export interface RenderWithQueryClientOptions
  extends Omit<RenderOptions, "wrapper"> {
  client?: QueryClient;
  clientConfig?: QueryClientConfig;
  suspenseFallback?: ReactNode;
}

export interface RenderWithQueryClientResult extends RenderResult {
  client: QueryClient;
}

export function createTestQueryClient(clientConfig?: QueryClientConfig) {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        retry: false,
      },
    },
    ...clientConfig,
  });
}

export function renderWithQueryClient(
  ui: ReactElement,
  options: RenderWithQueryClientOptions = {}
): RenderWithQueryClientResult {
  const {
    client = createTestQueryClient(options.clientConfig),
    suspenseFallback = null,
    ...renderOptions
  } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <Suspense fallback={suspenseFallback}>{children}</Suspense>
      </QueryClientProvider>
    );
  }

  return {
    client,
    ...render(ui, {
      wrapper: Wrapper,
      ...renderOptions,
    }),
  };
}
