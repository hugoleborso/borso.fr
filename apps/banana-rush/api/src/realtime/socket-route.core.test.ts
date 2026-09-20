import { describe, expect, it } from 'vitest';
import {
  isClosingRoute,
  isOpeningRoute,
  selectRouteStatus,
  selectSocketRoute,
} from './socket-route.core';

// @FollowsBlueprint test-pure-unit
describe('selectSocketRoute', () => {
  it('opens a connection that names a game', () => {
    expect(selectSocketRoute('c1', '$connect', { code: 'ABCD', token: 't1' })).toEqual({
      kind: 'open',
      connectionId: 'c1',
      joinCode: 'ABCD',
      token: 't1',
    });
  });

  it('opens a connection for a watcher holding no token', () => {
    expect(selectSocketRoute('c1', '$connect', { code: 'ABCD' })).toEqual({
      kind: 'open',
      connectionId: 'c1',
      joinCode: 'ABCD',
      token: null,
    });
  });

  it('closes a connection on disconnect', () => {
    expect(selectSocketRoute('c1', '$disconnect', null)).toEqual({
      kind: 'close',
      connectionId: 'c1',
    });
  });

  it('ignores any other route, because the socket carries no commands', () => {
    expect(selectSocketRoute('c1', '$default', null)).toEqual({ kind: 'ignore' });
  });

  it('refuses an event carrying no connection identifier', () => {
    expect(selectSocketRoute(undefined, '$connect', { code: 'ABCD' })).toEqual({ kind: 'refuse' });
  });

  it('refuses a connection naming no game', () => {
    expect(selectSocketRoute('c1', '$connect', {})).toEqual({ kind: 'refuse' });
  });

  it('refuses a connection whose game code is empty', () => {
    expect(selectSocketRoute('c1', '$connect', { code: '' })).toEqual({ kind: 'refuse' });
  });

  it('refuses a connection that carries no query at all', () => {
    expect(selectSocketRoute('c1', '$connect', null)).toEqual({ kind: 'refuse' });
  });

  it('refuses a connection whose query is missing entirely', () => {
    expect(selectSocketRoute('c1', '$connect', undefined)).toEqual({ kind: 'refuse' });
  });

  it('ignores an event with no route key', () => {
    expect(selectSocketRoute('c1', undefined, null)).toEqual({ kind: 'ignore' });
  });
});

describe('the route predicates and status', () => {
  it('recognises an opening route', () => {
    expect(isOpeningRoute(selectSocketRoute('c1', '$connect', { code: 'ABCD' }))).toBe(true);
    expect(isClosingRoute(selectSocketRoute('c1', '$connect', { code: 'ABCD' }))).toBe(false);
  });

  it('recognises a closing route', () => {
    expect(isClosingRoute(selectSocketRoute('c1', '$disconnect', null))).toBe(true);
    expect(isOpeningRoute(selectSocketRoute('c1', '$disconnect', null))).toBe(false);
  });

  it('answers a refusal status for a route it refused', () => {
    expect(selectRouteStatus({ kind: 'refuse' })).toBe(400);
  });

  it('answers an accepting status for anything it did not refuse', () => {
    expect(selectRouteStatus({ kind: 'ignore' })).toBe(200);
  });
});
