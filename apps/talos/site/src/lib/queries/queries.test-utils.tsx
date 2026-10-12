import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

export function createIsolatedQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export interface MountedTree {
  container: HTMLDivElement;
  root: Root;
  unmount: () => void;
}

export function mountWithClient(queryClient: QueryClient, node: ReactNode): MountedTree {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
  });
  return {
    container,
    root,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

export interface FetchStub {
  restore: () => void;
  calls: Request[];
}

const STUB_BASE_URL = 'http://localhost.test';

export function stubFetch(handler: (request: Request) => Promise<Response>): FetchStub {
  const original = globalThis.fetch;
  const calls: Request[] = [];
  globalThis.fetch = async (input, init) => {
    const absolute =
      input instanceof Request
        ? input
        : new Request(
            typeof input === 'string' && input.startsWith('/') ? `${STUB_BASE_URL}${input}` : input,
            init,
          );
    calls.push(absolute);
    return await handler(absolute);
  };
  return {
    restore: () => {
      globalThis.fetch = original;
    },
    calls,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const NEXT_TASK_DELAY_MS = 0;

export async function flushTasks(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, NEXT_TASK_DELAY_MS);
    });
  });
}

const WALL_CLOCK_SETTLE_BUDGET_MS = 4000;

export async function flushUntil(isSettled: () => boolean): Promise<void> {
  const deadline = Date.now() + WALL_CLOCK_SETTLE_BUDGET_MS;
  while (!isSettled()) {
    if (Date.now() > deadline) {
      throw new Error(
        `flushUntil: the condition did not hold within ${WALL_CLOCK_SETTLE_BUDGET_MS} ms.`,
      );
    }
    await flushTasks();
  }
}
