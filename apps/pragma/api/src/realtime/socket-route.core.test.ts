import { describe, expect, it } from 'vitest';
import {
  isClosingRoute,
  isOpeningRoute,
  selectRouteStatus,
  selectSocketRoute,
} from './socket-route.core';

// @FollowsBlueprint test-pure-unit
describe('selectSocketRoute', () => {
  it('opens a connection that carries a ticket and the tab it comes from', () => {
    expect(selectSocketRoute('c1', '$connect', { ticket: 't1', client: 'tab-1' })).toStrictEqual({
      kind: 'open',
      connectionId: 'c1',
      ticket: 't1',
      clientId: 'tab-1',
    });
  });

  it('refuses a connection carrying no ticket', () => {
    expect(selectSocketRoute('c1', '$connect', { client: 'tab-1' })).toStrictEqual({
      kind: 'refuse',
    });
  });

  it('refuses a connection whose ticket is empty', () => {
    expect(selectSocketRoute('c1', '$connect', { ticket: '', client: 'tab-1' })).toStrictEqual({
      kind: 'refuse',
    });
  });

  it('refuses a connection naming no tab, or an empty one', () => {
    expect(selectSocketRoute('c1', '$connect', { ticket: 't1' })).toStrictEqual({
      kind: 'refuse',
    });
    expect(selectSocketRoute('c1', '$connect', { ticket: 't1', client: '' })).toStrictEqual({
      kind: 'refuse',
    });
  });

  it('closes a connection on disconnect', () => {
    expect(selectSocketRoute('c1', '$disconnect', null)).toStrictEqual({
      kind: 'close',
      connectionId: 'c1',
    });
  });

  it('ignores any other route, because the socket carries no commands', () => {
    expect(selectSocketRoute('c1', '$default', null)).toStrictEqual({ kind: 'ignore' });
  });

  it('refuses an event carrying no connection identifier', () => {
    expect(
      selectSocketRoute(undefined, '$connect', { ticket: 't1', client: 'tab-1' }),
    ).toStrictEqual({ kind: 'refuse' });
  });

  it('refuses a connection that carries no query at all', () => {
    expect(selectSocketRoute('c1', '$connect', null)).toStrictEqual({ kind: 'refuse' });
    expect(selectSocketRoute('c1', '$connect', undefined)).toStrictEqual({ kind: 'refuse' });
  });

  it('ignores an event with no route key', () => {
    expect(selectSocketRoute('c1', undefined, null)).toStrictEqual({ kind: 'ignore' });
  });
});

describe('the route predicates and status', () => {
  const opening = selectSocketRoute('c1', '$connect', { ticket: 't1', client: 'tab-1' });
  const closing = selectSocketRoute('c1', '$disconnect', null);

  it('recognises an opening route', () => {
    expect(isOpeningRoute(opening)).toBe(true);
    expect(isClosingRoute(opening)).toBe(false);
  });

  it('recognises a closing route', () => {
    expect(isClosingRoute(closing)).toBe(true);
    expect(isOpeningRoute(closing)).toBe(false);
  });

  it('answers a refusal status for a route it refused', () => {
    expect(selectRouteStatus({ kind: 'refuse' })).toBe(400);
  });

  it('answers an accepting status for anything it did not refuse', () => {
    expect(selectRouteStatus({ kind: 'ignore' })).toBe(200);
  });
});
