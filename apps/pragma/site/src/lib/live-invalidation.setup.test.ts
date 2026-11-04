import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { RealtimeTicketGrant } from './live-invalidation.core';
import {
  createLiveInvalidation,
  type LiveInvalidationSettings,
  type LiveSocketListeners,
} from './live-invalidation.setup';
import { authKeys, type SessionProbeResult } from './queries/auth.queries';

const GRANT: RealtimeTicketGrant = { url: 'wss://socket.example/prod', ticket: 'signed' };

function ignoreCancel(): void {
  return undefined;
}

interface FakeSocket {
  readonly address: string;
  readonly listeners: LiveSocketListeners;
  isClosed: boolean;
}

function buildHarness(options: { readonly grant?: RealtimeTicketGrant | null } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const sockets: FakeSocket[] = [];
  const visibilityListeners: (() => void)[] = [];
  const waits: { readonly milliseconds: number; readonly callback: () => void }[] = [];
  const page = { isVisible: true };
  const requestTicket = vi.fn(() =>
    Promise.resolve(options.grant === undefined ? GRANT : options.grant),
  );
  const settings: LiveInvalidationSettings = {
    queryClient,
    clientId: 'tab-1',
    requestTicket,
    openSocket: (address, listeners) => {
      const socket: FakeSocket = { address, listeners, isClosed: false };
      sockets.push(socket);
      return {
        close: () => {
          socket.isClosed = true;
        },
      };
    },
    isPageVisible: () => page.isVisible,
    onPageVisibilityChange: (listener) => {
      visibilityListeners.push(listener);
    },
    wait: (milliseconds, callback) => {
      waits.push({ milliseconds, callback });
      return ignoreCancel;
    },
  };
  createLiveInvalidation(settings);
  return {
    queryClient,
    sockets,
    waits,
    requestTicket,
    signIn: () => {
      queryClient.setQueryData<SessionProbeResult>(authKeys.session(), { authenticated: true });
    },
    setVisible: (isVisible: boolean) => {
      page.isVisible = isVisible;
      visibilityListeners.forEach((listener) => {
        listener();
      });
    },
  };
}

function lastSocket(sockets: readonly FakeSocket[]): FakeSocket {
  const socket = sockets.at(-1);
  if (socket === undefined) throw new Error('no socket was opened');
  return socket;
}

function isInvalidated(queryClient: QueryClient, queryKey: readonly string[]): boolean {
  return queryClient.getQueryState(queryKey)?.isInvalidated === true;
}

// @FollowsBlueprint test-pure-unit
describe('the live invalidation of one tab', () => {
  it('opens no socket before the member is signed in', async () => {
    const harness = buildHarness();
    harness.setVisible(true);
    await Promise.resolve();
    expect(harness.requestTicket).not.toHaveBeenCalled();
  });

  it('opens the socket the ticket names once a visible tab is signed in', async () => {
    const harness = buildHarness();
    harness.signIn();
    await vi.waitFor(() => {
      expect(harness.sockets).toHaveLength(1);
    });
    expect(lastSocket(harness.sockets).address).toBe(
      'wss://socket.example/prod?ticket=signed&client=tab-1',
    );
  });

  it('invalidates the queries under the scope a message names, and only those', async () => {
    const harness = buildHarness();
    harness.queryClient.setQueryData(['setlists', 'list'], []);
    harness.queryClient.setQueryData(['songs', 'list'], []);
    harness.signIn();
    await vi.waitFor(() => {
      expect(harness.sockets).toHaveLength(1);
    });
    const socket = lastSocket(harness.sockets);
    socket.listeners.onOpen();
    socket.listeners.onMessage('{"kind":"stale","scope":"setlists"}');
    expect(isInvalidated(harness.queryClient, ['setlists', 'list'])).toBe(true);
    expect(isInvalidated(harness.queryClient, ['songs', 'list'])).toBe(false);
  });

  it('closes the socket when the page is hidden, and invalidates everything when it opens again', async () => {
    const harness = buildHarness();
    harness.queryClient.setQueryData(['songs', 'list'], []);
    harness.signIn();
    await vi.waitFor(() => {
      expect(harness.sockets).toHaveLength(1);
    });
    lastSocket(harness.sockets).listeners.onOpen();

    harness.setVisible(false);
    expect(lastSocket(harness.sockets).isClosed).toBe(true);
    lastSocket(harness.sockets).listeners.onClose();
    expect(harness.waits).toHaveLength(0);

    harness.setVisible(true);
    await vi.waitFor(() => {
      expect(harness.sockets).toHaveLength(2);
    });
    lastSocket(harness.sockets).listeners.onOpen();
    expect(isInvalidated(harness.queryClient, ['songs', 'list'])).toBe(true);
  });

  it('holds an invalidation while a write is pending and flushes it once the write settles', async () => {
    const harness = buildHarness();
    harness.queryClient.setQueryData(['setlists', 'list'], []);
    harness.signIn();
    await vi.waitFor(() => {
      expect(harness.sockets).toHaveLength(1);
    });
    const socket = lastSocket(harness.sockets);
    socket.listeners.onOpen();
    const settle = { resolve: (): void => undefined };
    const pendingWrite = new Promise<null>((resolve) => {
      settle.resolve = () => {
        resolve(null);
      };
    });
    const write = harness.queryClient
      .getMutationCache()
      .build(harness.queryClient, { mutationFn: () => pendingWrite });
    const writing = write.execute(undefined);

    socket.listeners.onMessage('{"kind":"stale","scope":"setlists"}');
    expect(isInvalidated(harness.queryClient, ['setlists', 'list'])).toBe(false);

    settle.resolve();
    await writing;
    expect(isInvalidated(harness.queryClient, ['setlists', 'list'])).toBe(true);
  });

  it('reconnects after an unexpected close, once the delay has passed', async () => {
    const harness = buildHarness();
    harness.signIn();
    await vi.waitFor(() => {
      expect(harness.sockets).toHaveLength(1);
    });
    lastSocket(harness.sockets).listeners.onClose();
    expect(harness.waits.map((wait) => wait.milliseconds)).toStrictEqual([1_000]);

    harness.waits[0]?.callback();
    await vi.waitFor(() => {
      expect(harness.sockets).toHaveLength(2);
    });
    expect(harness.requestTicket).toHaveBeenCalledTimes(2);
  });

  it('opens nothing when the API names no socket', async () => {
    const harness = buildHarness({ grant: { url: null, ticket: 'signed' } });
    harness.signIn();
    await vi.waitFor(() => {
      expect(harness.requestTicket).toHaveBeenCalledTimes(1);
    });
    harness.queryClient.setQueryData(['songs', 'list'], []);
    await Promise.resolve();
    expect(harness.sockets).toHaveLength(0);
    expect(harness.requestTicket).toHaveBeenCalledTimes(1);
  });
});
