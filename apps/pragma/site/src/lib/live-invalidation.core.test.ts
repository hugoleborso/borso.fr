import { describe, expect, it } from 'vitest';
import {
  addPendingScope,
  advanceLiveConnection,
  buildSocketAddress,
  INITIAL_LIVE_CONNECTION,
  isWriteMethod,
  type LiveConnectionEffects,
  type LiveConnectionEvent,
  type LiveConnectionState,
  readStaleScope,
  selectInvalidationFilter,
  selectRetryDelay,
} from './live-invalidation.core';

const NO_EFFECTS: LiveConnectionEffects = {
  ticketRequestFor: null,
  socketToOpen: null,
  isStopping: false,
  retry: null,
  scopesToInvalidate: [],
};

const GRANT = { url: 'wss://socket.example/prod', ticket: 'signed' };
const ADDRESS = 'wss://socket.example/prod?ticket=signed&client=tab-1';

function replay(events: readonly LiveConnectionEvent[]): LiveConnectionState {
  return events.reduce(
    (state, event) => advanceLiveConnection(state, event).state,
    INITIAL_LIVE_CONNECTION,
  );
}

const WANTED: LiveConnectionEvent = {
  kind: 'conditions-changed',
  isSignedIn: true,
  isPageVisible: true,
};
const UNWANTED: LiveConnectionEvent = {
  kind: 'conditions-changed',
  isSignedIn: true,
  isPageVisible: false,
};
const SIGNED_OUT: LiveConnectionEvent = {
  kind: 'conditions-changed',
  isSignedIn: false,
  isPageVisible: true,
};

function answered(generation: number): LiveConnectionEvent {
  return { kind: 'ticket-answered', generation, grant: GRANT, clientId: 'tab-1' };
}

function opened(generation: number, isMutating = false): LiveConnectionEvent {
  return { kind: 'socket-opened', generation, isMutating };
}

function message(generation: number, data: unknown, isMutating = false): LiveConnectionEvent {
  return { kind: 'message-received', generation, data, isMutating };
}

const OPEN = replay([WANTED, answered(1), opened(1)]);

// @FollowsBlueprint test-pure-unit
describe('advanceLiveConnection, opening', () => {
  it('asks for a ticket once the tab is visible and signed in', () => {
    expect(advanceLiveConnection(INITIAL_LIVE_CONNECTION, WANTED)).toStrictEqual({
      state: { ...INITIAL_LIVE_CONNECTION, phase: 'fetching-ticket', generation: 1 },
      effects: { ...NO_EFFECTS, ticketRequestFor: 1 },
    });
  });

  it('asks for nothing while it already holds or seeks a socket', () => {
    const fetching = replay([WANTED]);
    expect(advanceLiveConnection(fetching, WANTED)).toStrictEqual({
      state: fetching,
      effects: NO_EFFECTS,
    });
    expect(advanceLiveConnection(OPEN, WANTED)).toStrictEqual({ state: OPEN, effects: NO_EFFECTS });
  });

  it('opens the socket the ticket points at, naming the tab', () => {
    expect(advanceLiveConnection(replay([WANTED]), answered(1))).toStrictEqual({
      state: { ...INITIAL_LIVE_CONNECTION, phase: 'connecting', generation: 1 },
      effects: { ...NO_EFFECTS, socketToOpen: { generation: 1, address: ADDRESS } },
    });
  });

  it('stays idle when the API names no socket, as on a laptop with no channel', () => {
    const event: LiveConnectionEvent = {
      kind: 'ticket-answered',
      generation: 1,
      grant: { url: null, ticket: 'signed' },
      clientId: 'tab-1',
    };
    expect(advanceLiveConnection(replay([WANTED]), event)).toStrictEqual({
      state: { ...INITIAL_LIVE_CONNECTION, phase: 'unavailable', generation: 1 },
      effects: NO_EFFECTS,
    });
  });

  it('asks no second ticket of an API that named no socket until the page is hidden and shown', () => {
    const noChannel: LiveConnectionEvent = {
      kind: 'ticket-answered',
      generation: 1,
      grant: { url: null, ticket: 'signed' },
      clientId: 'tab-1',
    };
    const unavailable = replay([WANTED, noChannel]);
    expect(advanceLiveConnection(unavailable, WANTED).effects).toStrictEqual(NO_EFFECTS);
    expect(
      advanceLiveConnection(replay([WANTED, noChannel, UNWANTED]), WANTED).effects,
    ).toStrictEqual({ ...NO_EFFECTS, ticketRequestFor: 3 });
  });

  it('invalidates nothing when the first socket of the page opens', () => {
    expect(advanceLiveConnection(replay([WANTED, answered(1)]), opened(1))).toStrictEqual({
      state: { ...INITIAL_LIVE_CONNECTION, phase: 'open', generation: 1, hasOpenedBefore: true },
      effects: NO_EFFECTS,
    });
  });

  it('invalidates every query when a socket opens again, because messages were missed', () => {
    const reopening = replay([WANTED, answered(1), opened(1), UNWANTED, WANTED, answered(3)]);
    expect(advanceLiveConnection(reopening, opened(3))).toStrictEqual({
      state: { ...reopening, phase: 'open', failedAttempts: 0 },
      effects: { ...NO_EFFECTS, scopesToInvalidate: ['all'] },
    });
  });

  it('holds the reopening invalidation while a write is pending', () => {
    const reopening = replay([WANTED, answered(1), opened(1), UNWANTED, WANTED, answered(3)]);
    expect(advanceLiveConnection(reopening, opened(3, true))).toStrictEqual({
      state: { ...reopening, phase: 'open', pendingScopes: ['all'] },
      effects: NO_EFFECTS,
    });
  });
});

describe('advanceLiveConnection, closing and retrying', () => {
  it('closes the socket when the page is hidden, and forgets the generation it belonged to', () => {
    expect(advanceLiveConnection(OPEN, UNWANTED)).toStrictEqual({
      state: { ...OPEN, phase: 'idle', generation: 2 },
      effects: { ...NO_EFFECTS, isStopping: true },
    });
  });

  it('does nothing when told to stop while already idle', () => {
    expect(advanceLiveConnection(INITIAL_LIVE_CONNECTION, UNWANTED)).toStrictEqual({
      state: INITIAL_LIVE_CONNECTION,
      effects: NO_EFFECTS,
    });
  });

  it('closes the socket of a member who signs out, even with the page visible', () => {
    expect(advanceLiveConnection(OPEN, SIGNED_OUT)).toStrictEqual({
      state: { ...OPEN, phase: 'idle', generation: 2 },
      effects: { ...NO_EFFECTS, isStopping: true },
    });
    expect(advanceLiveConnection(INITIAL_LIVE_CONNECTION, SIGNED_OUT).effects).toStrictEqual(
      NO_EFFECTS,
    );
  });

  it('ignores the close of a socket the tab closed itself', () => {
    const hidden = replay([WANTED, answered(1), opened(1), UNWANTED]);
    expect(advanceLiveConnection(hidden, { kind: 'socket-closed', generation: 1 })).toStrictEqual({
      state: hidden,
      effects: NO_EFFECTS,
    });
  });

  it('never opens a socket for a ticket that answers after the page was hidden', () => {
    const hidden = replay([WANTED, UNWANTED]);
    expect(advanceLiveConnection(hidden, answered(1))).toStrictEqual({
      state: hidden,
      effects: NO_EFFECTS,
    });
  });

  it('retries an unexpected close after a delay, then asks a fresh ticket', () => {
    const closed = advanceLiveConnection(OPEN, { kind: 'socket-closed', generation: 1 });
    expect(closed).toStrictEqual({
      state: { ...OPEN, phase: 'waiting-to-retry', failedAttempts: 1 },
      effects: { ...NO_EFFECTS, retry: { generation: 1, delayMilliseconds: 1_000 } },
    });
    expect(advanceLiveConnection(closed.state, { kind: 'retry-due', generation: 1 })).toStrictEqual(
      {
        state: { ...closed.state, phase: 'fetching-ticket' },
        effects: { ...NO_EFFECTS, ticketRequestFor: 1 },
      },
    );
  });

  it('retries a refused ticket with a delay that grows', () => {
    const refused: LiveConnectionEvent = {
      kind: 'ticket-answered',
      generation: 1,
      grant: null,
      clientId: 'tab-1',
    };
    const once = replay([WANTED, refused, { kind: 'retry-due', generation: 1 }]);
    expect(advanceLiveConnection(once, refused)).toStrictEqual({
      state: { ...once, phase: 'waiting-to-retry', failedAttempts: 2 },
      effects: { ...NO_EFFECTS, retry: { generation: 1, delayMilliseconds: 2_000 } },
    });
  });

  it('ignores a retry that comes due after the page was hidden', () => {
    const hidden = replay([
      WANTED,
      answered(1),
      opened(1),
      { kind: 'socket-closed', generation: 1 },
      UNWANTED,
    ]);
    expect(advanceLiveConnection(hidden, { kind: 'retry-due', generation: 1 })).toStrictEqual({
      state: hidden,
      effects: NO_EFFECTS,
    });
    expect(hidden.failedAttempts).toBe(0);
  });

  it('ignores the late close of a socket the tab replaced, while the new one stays open', () => {
    const reopened = replay([
      WANTED,
      answered(1),
      opened(1),
      UNWANTED,
      WANTED,
      answered(3),
      opened(3),
    ]);
    expect(advanceLiveConnection(reopened, { kind: 'socket-closed', generation: 1 })).toStrictEqual(
      {
        state: reopened,
        effects: NO_EFFECTS,
      },
    );
    expect(
      advanceLiveConnection(reopened, message(1, '{"kind":"stale","scope":"setlists"}')),
    ).toStrictEqual({ state: reopened, effects: NO_EFFECTS });
  });

  it('ignores a socket opening that no socket was asked for', () => {
    expect(advanceLiveConnection(OPEN, opened(1))).toStrictEqual({
      state: OPEN,
      effects: NO_EFFECTS,
    });
  });
});

describe('advanceLiveConnection, messages', () => {
  it('invalidates the scope a message names', () => {
    expect(
      advanceLiveConnection(OPEN, message(1, '{"kind":"stale","scope":"setlists"}')),
    ).toStrictEqual({
      state: OPEN,
      effects: { ...NO_EFFECTS, scopesToInvalidate: ['setlists'] },
    });
  });

  it('ignores a message it cannot read', () => {
    expect(advanceLiveConnection(OPEN, message(1, 'not json'))).toStrictEqual({
      state: OPEN,
      effects: NO_EFFECTS,
    });
  });

  it('ignores a message from a socket the tab gave up on', () => {
    const hidden = advanceLiveConnection(OPEN, UNWANTED).state;
    expect(
      advanceLiveConnection(hidden, message(1, '{"kind":"stale","scope":"setlists"}')),
    ).toStrictEqual({ state: hidden, effects: NO_EFFECTS });
  });

  it('holds a message while a write is pending, so an optimistic write is never undone', () => {
    const holding = advanceLiveConnection(
      OPEN,
      message(1, '{"kind":"stale","scope":"tasks"}', true),
    );
    expect(holding).toStrictEqual({
      state: { ...OPEN, pendingScopes: ['tasks'] },
      effects: NO_EFFECTS,
    });
  });

  it('flushes what it held once no write is pending any more', () => {
    const holding = replay([
      WANTED,
      answered(1),
      opened(1),
      message(1, '{"kind":"stale","scope":"tasks"}', true),
      message(1, '{"kind":"stale","scope":"bars"}', true),
    ]);
    expect(
      advanceLiveConnection(holding, { kind: 'mutations-changed', isMutating: true }),
    ).toStrictEqual({
      state: holding,
      effects: NO_EFFECTS,
    });
    expect(
      advanceLiveConnection(holding, { kind: 'mutations-changed', isMutating: false }),
    ).toStrictEqual({
      state: { ...holding, pendingScopes: [] },
      effects: { ...NO_EFFECTS, scopesToInvalidate: ['tasks', 'bars'] },
    });
  });

  it('flushes nothing when nothing is held', () => {
    expect(
      advanceLiveConnection(OPEN, { kind: 'mutations-changed', isMutating: false }),
    ).toStrictEqual({
      state: OPEN,
      effects: NO_EFFECTS,
    });
  });
});

describe('readStaleScope', () => {
  it('reads the scope of a stale message', () => {
    expect(readStaleScope('{"kind":"stale","scope":"all"}')).toBe('all');
  });

  it('refuses anything else', () => {
    expect(readStaleScope(42)).toBeNull();
    expect(readStaleScope(['{"kind":"stale","scope":"all"}'])).toBeNull();
    expect(readStaleScope('{')).toBeNull();
    expect(readStaleScope('null')).toBeNull();
    expect(readStaleScope('"stale"')).toBeNull();
    expect(readStaleScope('{"scope":"setlists"}')).toBeNull();
    expect(readStaleScope('{"kind":"other","scope":"setlists"}')).toBeNull();
    expect(readStaleScope('{"kind":"stale"}')).toBeNull();
    expect(readStaleScope('{"kind":"stale","scope":"auth"}')).toBeNull();
  });
});

describe('addPendingScope', () => {
  it('adds a scope once', () => {
    expect(addPendingScope(['tasks'], 'bars')).toStrictEqual(['tasks', 'bars']);
    expect(addPendingScope(['tasks'], 'tasks')).toStrictEqual(['tasks']);
  });

  it('collapses into every scope as soon as one of them is every scope', () => {
    expect(addPendingScope(['tasks'], 'all')).toStrictEqual(['all']);
    expect(addPendingScope(['all'], 'tasks')).toStrictEqual(['all']);
  });
});

describe('the small helpers', () => {
  it('builds the address with the ticket and the tab', () => {
    expect(buildSocketAddress('wss://socket.example/prod', 'a b', 'tab-1')).toBe(
      'wss://socket.example/prod?ticket=a+b&client=tab-1',
    );
  });

  it('doubles the retry delay from one second up to thirty', () => {
    expect([0, 1, 2, 4, 5, 9].map(selectRetryDelay)).toStrictEqual([
      1_000, 2_000, 4_000, 16_000, 30_000, 30_000,
    ]);
  });

  it('filters the queries under a scope, or every query', () => {
    expect(selectInvalidationFilter('setlists')).toStrictEqual({ queryKey: ['setlists'] });
    expect(selectInvalidationFilter('all')).toStrictEqual({});
  });

  it('treats every method but a read as a write', () => {
    expect(isWriteMethod('post')).toBe(true);
    expect(isWriteMethod('DELETE')).toBe(true);
    expect(isWriteMethod('GET')).toBe(false);
    expect(isWriteMethod('head')).toBe(false);
    expect(isWriteMethod('OPTIONS')).toBe(false);
    expect(isWriteMethod(undefined)).toBe(false);
  });
});
