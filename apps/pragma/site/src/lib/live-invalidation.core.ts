import {
  EVERY_WRITTEN_ROOT,
  isReadMethod,
  isWrittenRoot,
  STALE_MESSAGE_KIND,
  type WrittenRoot,
} from '@domain/stale-scope.core';
import { z } from 'zod';
import { selectStaleQueryRoots } from './queries/query-read-roots.core';
import type { RealtimeTicketGrant } from './queries/realtime.queries';

const FIRST_RETRY_DELAY_MS = 1_000;
const LONGEST_RETRY_DELAY_MS = 30_000;
const RETRY_GROWTH_FACTOR = 2;
const TICKET_PARAMETER = 'ticket';
const CLIENT_PARAMETER = 'client';

export type LiveConnectionPhase =
  | 'idle'
  | 'fetching-ticket'
  | 'connecting'
  | 'open'
  | 'waiting-to-retry'
  | 'unavailable';

export interface LiveConnectionState {
  readonly phase: LiveConnectionPhase;
  readonly generation: number;
  readonly failedAttempts: number;
  readonly hasOpenedBefore: boolean;
  readonly pendingWrittenRoots: readonly WrittenRoot[];
}

export const INITIAL_LIVE_CONNECTION: LiveConnectionState = {
  phase: 'idle',
  generation: 0,
  failedAttempts: 0,
  hasOpenedBefore: false,
  pendingWrittenRoots: [],
};

export type LiveConnectionEvent =
  | {
      readonly kind: 'conditions-changed';
      readonly isSignedIn: boolean;
      readonly isPageVisible: boolean;
    }
  | {
      readonly kind: 'ticket-answered';
      readonly generation: number;
      readonly grant: RealtimeTicketGrant | null;
      readonly clientId: string;
    }
  | { readonly kind: 'socket-opened'; readonly generation: number; readonly isMutating: boolean }
  | { readonly kind: 'socket-closed'; readonly generation: number }
  | { readonly kind: 'retry-due'; readonly generation: number }
  | {
      readonly kind: 'message-received';
      readonly generation: number;
      readonly data: unknown;
      readonly isMutating: boolean;
    }
  | { readonly kind: 'mutations-changed'; readonly isMutating: boolean };

export interface LiveConnectionEffects {
  readonly ticketRequestFor: number | null;
  readonly socketToOpen: { readonly generation: number; readonly address: string } | null;
  readonly isStopping: boolean;
  readonly retry: { readonly generation: number; readonly delayMilliseconds: number } | null;
  readonly writtenRootsToInvalidate: readonly WrittenRoot[];
}

export interface LiveConnectionStep {
  readonly state: LiveConnectionState;
  readonly effects: LiveConnectionEffects;
}

const NO_EFFECTS: LiveConnectionEffects = {
  ticketRequestFor: null,
  socketToOpen: null,
  isStopping: false,
  retry: null,
  writtenRootsToInvalidate: [],
};

export function buildSocketAddress(url: string, ticket: string, clientId: string): string {
  const address = new URL(url);
  address.searchParams.set(TICKET_PARAMETER, ticket);
  address.searchParams.set(CLIENT_PARAMETER, clientId);
  return address.toString();
}

export function selectRetryDelay(failedAttempts: number): number {
  return Math.min(
    FIRST_RETRY_DELAY_MS * RETRY_GROWTH_FACTOR ** failedAttempts,
    LONGEST_RETRY_DELAY_MS,
  );
}

const staleMessageSchema = z.object({
  kind: z.literal(STALE_MESSAGE_KIND),
  written: z.array(z.string()).min(1),
});

function parseJsonText(text: string): { readonly value: unknown } {
  try {
    return { value: JSON.parse(text) };
  } catch {
    // Stryker disable next-line ObjectLiteral: equivalent mutant, an unreadable frame read as undefined instead of null is refused by the message schema alike.
    return { value: null };
  }
}

function readWrittenRoot(entry: string): WrittenRoot {
  return isWrittenRoot(entry) ? entry : EVERY_WRITTEN_ROOT;
}

export function readStaleWrittenRoots(data: unknown): readonly WrittenRoot[] | null {
  if (typeof data !== 'string') return null;
  const staleMessage = staleMessageSchema.safeParse(parseJsonText(data).value);
  if (!staleMessage.success) return null;
  return staleMessage.data.written.map(readWrittenRoot);
}

export function addPendingWrittenRoots(
  pendingWrittenRoots: readonly WrittenRoot[],
  written: readonly WrittenRoot[],
): readonly WrittenRoot[] {
  const merged = [...new Set([...pendingWrittenRoots, ...written])];
  return merged.includes(EVERY_WRITTEN_ROOT) ? [EVERY_WRITTEN_ROOT] : merged;
}

export function selectInvalidationFilters(
  written: readonly WrittenRoot[],
): readonly { readonly queryKey?: readonly [string] }[] {
  const staleQueryRoots = selectStaleQueryRoots(written);
  if (staleQueryRoots === EVERY_WRITTEN_ROOT) return [{}];
  return staleQueryRoots.map((queryRoot) => ({ queryKey: [queryRoot] }));
}

export function isWriteMethod(method: string | undefined): boolean {
  return method !== undefined && !isReadMethod(method);
}

function receiveWrittenRoots(
  state: LiveConnectionState,
  written: readonly WrittenRoot[],
  isMutating: boolean,
): LiveConnectionStep {
  if (isMutating) {
    return {
      state: {
        ...state,
        pendingWrittenRoots: addPendingWrittenRoots(state.pendingWrittenRoots, written),
      },
      effects: NO_EFFECTS,
    };
  }
  return { state, effects: { ...NO_EFFECTS, writtenRootsToInvalidate: written } };
}

function waitToRetry(state: LiveConnectionState): LiveConnectionStep {
  return {
    state: { ...state, phase: 'waiting-to-retry', failedAttempts: state.failedAttempts + 1 },
    effects: {
      ...NO_EFFECTS,
      retry: {
        generation: state.generation,
        delayMilliseconds: selectRetryDelay(state.failedAttempts),
      },
    },
  };
}

function requestTicket(state: LiveConnectionState, generation: number): LiveConnectionStep {
  return {
    state: { ...state, phase: 'fetching-ticket', generation },
    effects: { ...NO_EFFECTS, ticketRequestFor: generation },
  };
}

function changeConditions(state: LiveConnectionState, isWanted: boolean): LiveConnectionStep {
  const isIdle = state.phase === 'idle';
  if (isWanted === !isIdle) return { state, effects: NO_EFFECTS };
  if (isWanted) return requestTicket(state, state.generation + 1);
  return {
    state: { ...state, phase: 'idle', generation: state.generation + 1, failedAttempts: 0 },
    effects: { ...NO_EFFECTS, isStopping: true },
  };
}

function answerTicket(
  state: LiveConnectionState,
  grant: RealtimeTicketGrant | null,
  clientId: string,
): LiveConnectionStep {
  if (grant === null) return waitToRetry(state);
  if (grant.url === null) return { state: { ...state, phase: 'unavailable' }, effects: NO_EFFECTS };
  return {
    state: { ...state, phase: 'connecting' },
    effects: {
      ...NO_EFFECTS,
      socketToOpen: {
        generation: state.generation,
        address: buildSocketAddress(grant.url, grant.ticket, clientId),
      },
    },
  };
}

function openSocket(state: LiveConnectionState, isMutating: boolean): LiveConnectionStep {
  const opened: LiveConnectionState = {
    ...state,
    phase: 'open',
    failedAttempts: 0,
    hasOpenedBefore: true,
  };
  if (!state.hasOpenedBefore) return { state: opened, effects: NO_EFFECTS };
  return receiveWrittenRoots(opened, [EVERY_WRITTEN_ROOT], isMutating);
}

function flushPendingWrittenRoots(
  state: LiveConnectionState,
  isMutating: boolean,
): LiveConnectionStep {
  if (isMutating) return { state, effects: NO_EFFECTS };
  return {
    state: { ...state, pendingWrittenRoots: [] },
    effects: { ...NO_EFFECTS, writtenRootsToInvalidate: state.pendingWrittenRoots },
  };
}

function receiveMessage(
  state: LiveConnectionState,
  data: unknown,
  isMutating: boolean,
): LiveConnectionStep {
  const written = readStaleWrittenRoots(data);
  if (written === null) return { state, effects: NO_EFFECTS };
  return receiveWrittenRoots(state, written, isMutating);
}

function isCurrentGeneration(state: LiveConnectionState, event: LiveConnectionEvent): boolean {
  return !('generation' in event) || event.generation === state.generation;
}

const EVERY_PHASE: ReadonlySet<LiveConnectionPhase> = new Set<LiveConnectionPhase>([
  'idle',
  'fetching-ticket',
  'connecting',
  'open',
  'waiting-to-retry',
  'unavailable',
]);

const PHASES_EXPECTING: Readonly<
  Record<LiveConnectionEvent['kind'], ReadonlySet<LiveConnectionPhase>>
> = {
  'conditions-changed': EVERY_PHASE,
  'ticket-answered': new Set(['fetching-ticket']),
  'socket-opened': new Set(['connecting']),
  'socket-closed': new Set(['connecting', 'open']),
  'retry-due': new Set(['waiting-to-retry']),
  'message-received': new Set(['open']),
  'mutations-changed': EVERY_PHASE,
};

// @FollowsBlueprint core-client-state-machine
export function advanceLiveConnection(
  state: LiveConnectionState,
  event: LiveConnectionEvent,
): LiveConnectionStep {
  const isExpected =
    isCurrentGeneration(state, event) && PHASES_EXPECTING[event.kind].has(state.phase);
  if (!isExpected) return { state, effects: NO_EFFECTS };
  switch (event.kind) {
    case 'conditions-changed':
      return changeConditions(state, event.isSignedIn && event.isPageVisible);
    case 'ticket-answered':
      return answerTicket(state, event.grant, event.clientId);
    case 'socket-opened':
      return openSocket(state, event.isMutating);
    case 'socket-closed':
      return waitToRetry(state);
    case 'retry-due':
      return requestTicket(state, state.generation);
    case 'message-received':
      return receiveMessage(state, event.data, event.isMutating);
    case 'mutations-changed':
      return flushPendingWrittenRoots(state, event.isMutating);
  }
}
