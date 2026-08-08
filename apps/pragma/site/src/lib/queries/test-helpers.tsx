/**
 * Test-side scaffolding for TanStack Query mutation tests.
 *
 * Each test runs against a fresh `QueryClient` so the cache doesn't
 * bleed across siblings. `stubFetch` replaces `globalThis.fetch`, and
 * `deferred()` lets a test observe the optimistic UI state between
 * dispatch and the server reply.
 *
 * The wrapper-component path is preferred over `renderHook` from
 * `@testing-library/react` because the project doesn't depend on that
 * library — see `apps/pragma/site/src/components/molecules/use-media-query.test.tsx`
 * for the same `react-dom/client` pattern.
 */

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

function throwUnboundResolver(): never {
  throw new Error('deferred resolver invoked before binding');
}

export function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolver: (value: T) => void = throwUnboundResolver;
  const promise = new Promise<T>((resolve) => {
    resolver = resolve;
  });
  return { promise, resolve: resolver };
}

/**
 * Yields the microtask queue ten times so all pending microtasks
 * scheduled by `mutate()` (`cancelQueries` awaits, `setQueryData`
 * notifications, observer rerenders) have flushed before the next
 * assertion. Ten turns covers TanStack Query's longest chain in both
 * `onMutate` and `onError`/`onSettled`.
 */
export async function flushMicrotasks(): Promise<void> {
  await act(async () => {
    for (let turn = 0; turn < 10; turn += 1) {
      await Promise.resolve();
    }
  });
}

/**
 * A slot a probe component publishes its `mutateAsync` handle into.
 *
 * The probe calls `sink` while React renders it, which TypeScript's control
 * flow analysis cannot see, so a plain `let capturedDispatch: Mutate | null =
 * null` stays narrowed to `null` and the check that follows reads as always
 * true. Putting the write behind `sink` and the read behind `read` makes the
 * absent case a real question again, and gives every suite the same message
 * when a probe never rendered.
 */
export function createMutateSlot<Dispatch>(): {
  readonly sink: (dispatch: Dispatch) => void;
  readonly read: () => Dispatch;
} {
  let captured: Dispatch | null = null;
  return {
    sink: (dispatch: Dispatch): void => {
      captured = dispatch;
    },
    read: (): Dispatch => {
      if (captured === null) {
        throw new Error('the probe component never published its mutate handle');
      }
      return captured;
    },
  };
}
