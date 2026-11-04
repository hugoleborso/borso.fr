/** @DependsOnExternal browser-websocket */
/** @Feature live-invalidation */

import type { QueryClient } from '@tanstack/react-query';
import { REALTIME_CLIENT_ID } from './api.client';
import {
  advanceLiveConnection,
  INITIAL_LIVE_CONNECTION,
  type LiveConnectionEffects,
  type LiveConnectionEvent,
  type RealtimeTicketGrant,
  selectInvalidationFilter,
} from './live-invalidation.core';
import { authKeys, type SessionProbeResult } from './queries/auth.queries';
import { requestRealtimeTicket } from './queries/realtime.queries';
import { queryClient } from './query-client.setup';

const VISIBLE = 'visible';
const VISIBILITY_CHANGE_EVENT = 'visibilitychange';

export interface LiveSocketListeners {
  readonly onOpen: () => void;
  readonly onMessage: (data: unknown) => void;
  readonly onClose: () => void;
}

export interface LiveSocket {
  readonly close: () => void;
}

export interface LiveInvalidationSettings {
  readonly queryClient: QueryClient;
  readonly clientId: string;
  readonly requestTicket: () => Promise<RealtimeTicketGrant | null>;
  readonly openSocket: (address: string, listeners: LiveSocketListeners) => LiveSocket;
  readonly isPageVisible: () => boolean;
  readonly onPageVisibilityChange: (listener: () => void) => void;
  readonly wait: (milliseconds: number, callback: () => void) => () => void;
}

export interface LiveInvalidation {
  readonly refresh: () => void;
}

function isSignedIn(client: QueryClient): boolean {
  return client.getQueryData<SessionProbeResult>(authKeys.session())?.authenticated === true;
}

// @FollowsBlueprint machine-singleton
export function createLiveInvalidation(settings: LiveInvalidationSettings): LiveInvalidation {
  const client = settings.queryClient;
  let state = INITIAL_LIVE_CONNECTION;
  let socket: LiveSocket | null = null;
  let cancelRetry: (() => void) | null = null;

  function stop(): void {
    cancelRetry?.();
    cancelRetry = null;
    socket?.close();
    socket = null;
  }

  function open(generation: number, address: string): void {
    socket = settings.openSocket(address, {
      onOpen: () => {
        dispatch({ kind: 'socket-opened', generation, isMutating: client.isMutating() > 0 });
      },
      onMessage: (data) => {
        dispatch({
          kind: 'message-received',
          generation,
          data,
          isMutating: client.isMutating() > 0,
        });
      },
      onClose: () => {
        dispatch({ kind: 'socket-closed', generation });
      },
    });
  }

  function fetchTicket(generation: number): void {
    void settings.requestTicket().then((grant) => {
      dispatch({ kind: 'ticket-answered', generation, grant, clientId: settings.clientId });
    });
  }

  function scheduleRetry(generation: number, delayMilliseconds: number): void {
    cancelRetry = settings.wait(delayMilliseconds, () => {
      cancelRetry = null;
      dispatch({ kind: 'retry-due', generation });
    });
  }

  function apply(effects: LiveConnectionEffects): void {
    if (effects.isStopping) stop();
    if (effects.ticketRequestFor !== null) fetchTicket(effects.ticketRequestFor);
    if (effects.socketToOpen !== null) {
      open(effects.socketToOpen.generation, effects.socketToOpen.address);
    }
    if (effects.retry !== null) {
      scheduleRetry(effects.retry.generation, effects.retry.delayMilliseconds);
    }
    for (const scope of effects.scopesToInvalidate) {
      void client.invalidateQueries(selectInvalidationFilter(scope));
    }
  }

  function dispatch(event: LiveConnectionEvent): void {
    const step = advanceLiveConnection(state, event);
    state = step.state;
    apply(step.effects);
  }

  function refresh(): void {
    dispatch({
      kind: 'conditions-changed',
      isSignedIn: isSignedIn(client),
      isPageVisible: settings.isPageVisible(),
    });
  }

  client.getQueryCache().subscribe(refresh);
  client.getMutationCache().subscribe(() => {
    dispatch({ kind: 'mutations-changed', isMutating: client.isMutating() > 0 });
  });
  settings.onPageVisibilityChange(refresh);

  return { refresh };
}

function openBrowserSocket(address: string, listeners: LiveSocketListeners): LiveSocket {
  const socket = new WebSocket(address);
  socket.addEventListener('open', listeners.onOpen);
  socket.addEventListener('message', (event: MessageEvent<unknown>) => {
    listeners.onMessage(event.data);
  });
  socket.addEventListener('close', listeners.onClose);
  return { close: () => socket.close() };
}

function isDocumentVisible(): boolean {
  return document.visibilityState === VISIBLE;
}

function listenToVisibility(listener: () => void): void {
  document.addEventListener(VISIBILITY_CHANGE_EVENT, listener);
}

function waitInBrowser(milliseconds: number, callback: () => void): () => void {
  const timer = setTimeout(callback, milliseconds);
  return () => clearTimeout(timer);
}

export function startLiveInvalidation(): void {
  createLiveInvalidation({
    queryClient,
    clientId: REALTIME_CLIENT_ID,
    requestTicket: requestRealtimeTicket,
    openSocket: openBrowserSocket,
    isPageVisible: isDocumentVisible,
    onPageVisibilityChange: listenToVisibility,
    wait: waitInBrowser,
  }).refresh();
}
