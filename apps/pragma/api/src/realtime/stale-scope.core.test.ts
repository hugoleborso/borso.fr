import { describe, expect, it } from 'vitest';
import {
  findStaleScopeRule,
  isReadMethod,
  isRouteGoingStale,
  selectAnnouncedStaleScope,
  selectStaleScope,
  selectToolStaleScope,
  STALE_SCOPE_RULES,
} from './stale-scope.core';

// @FollowsBlueprint test-pure-unit
describe('selectStaleScope', () => {
  it('names the setlists root for a reorder, the write members do together', () => {
    expect(selectStaleScope('PUT', '/api/setlists/s1/reorder')).toBe('setlists');
  });

  it('sends everything stale for a setlist vote, which the board and the setlist both read', () => {
    expect(selectStaleScope('PUT', '/api/setlists/s1/votes/song-1')).toBe('all');
    expect(selectStaleScope('PUT', '/api/setlists/s1/vote-status')).toBe('all');
    expect(selectStaleScope('POST', '/api/setlists/s1/close')).toBe('all');
  });

  it('sends everything stale for a write to a record other roots show, such as a song', () => {
    expect(selectStaleScope('DELETE', '/api/songs/song-1')).toBe('all');
  });

  it('names the root of a member contact and of a calendar feed, which live under me', () => {
    expect(selectStaleScope('PUT', '/api/me/contact')).toBe('members');
    expect(selectStaleScope('POST', '/api/me/calendar-feeds')).toBe('free-slots');
  });

  it('sends nothing for a write that changes no band data another member reads', () => {
    expect(selectStaleScope('POST', '/api/auth/login')).toBeNull();
    expect(selectStaleScope('POST', '/api/me/passkeys')).toBeNull();
    expect(selectStaleScope('POST', '/api/takes/sign')).toBeNull();
    expect(selectStaleScope('POST', '/mcp')).toBeNull();
  });

  it('sends nothing for a read, whatever the path', () => {
    expect(selectStaleScope('GET', '/api/setlists/s1')).toBeNull();
    expect(selectStaleScope('head', '/api/setlists')).toBeNull();
    expect(selectStaleScope('OPTIONS', '/api/setlists')).toBeNull();
  });

  it('sends nothing for a path no rule names', () => {
    expect(selectStaleScope('POST', '/api/unknown')).toBeNull();
  });
});

describe('findStaleScopeRule', () => {
  it('lets the first matching rule decide, so a narrow rule above refines a wide one below', () => {
    const rules = [
      { path: ['api', 'takes', 'sign'], scope: null },
      { path: ['api', 'takes'], scope: 'takes' as const },
    ];
    expect(findStaleScopeRule('/api/takes/sign', rules)).toStrictEqual(rules[0]);
    expect(findStaleScopeRule('/api/takes/t1', rules)).toStrictEqual(rules[1]);
  });

  it('matches a wildcard against any one segment and a literal against itself only', () => {
    const rules = [{ path: ['api', '*', 'close'], scope: null }];
    expect(findStaleScopeRule('/api/anything/close', rules)).toStrictEqual(rules[0]);
    expect(findStaleScopeRule('/api/anything/open', rules)).toBeNull();
  });

  it('finds no rule whose trailing wildcard would have to match a segment the path lacks', () => {
    expect(
      findStaleScopeRule('/api/setlists', [{ path: ['api', 'setlists', '*'], scope: null }]),
    ).toBeNull();
  });

  it('finds no rule longer than the path itself', () => {
    expect(
      findStaleScopeRule('/api', [{ path: ['api', 'setlists'], scope: 'setlists' }]),
    ).toBeNull();
  });

  it('ignores the empty segments a leading or doubled slash leaves', () => {
    expect(findStaleScopeRule('//api//tasks/', STALE_SCOPE_RULES)?.scope).toBe('tasks');
  });

  it('reads the application table when no table is passed', () => {
    expect(findStaleScopeRule('/api/bars/b1')?.scope).toBe('bars');
  });
});

describe('isReadMethod', () => {
  it('treats only the methods that change nothing as reads', () => {
    expect(isReadMethod('get')).toBe(true);
    expect(isReadMethod('POST')).toBe(false);
    expect(isReadMethod('DELETE')).toBe(false);
  });
});

describe('isRouteGoingStale and selectToolStaleScope', () => {
  it('reads a route written as a method and a path', () => {
    expect(isRouteGoingStale('PUT /api/setlists/:id/reorder')).toBe(true);
    expect(isRouteGoingStale('GET /api/setlists')).toBe(false);
    expect(isRouteGoingStale('POST /api/takes/sign')).toBe(false);
  });

  it('refuses a route carrying no method', () => {
    expect(isRouteGoingStale('/api/setlists')).toBe(false);
  });

  it('sends everything stale for a tool that serves at least one write', () => {
    expect(selectToolStaleScope({ routes: ['GET /api/tasks', 'PUT /api/tasks/:id'] })).toBe('all');
  });

  it('sends nothing for a tool that only reads', () => {
    expect(selectToolStaleScope({ routes: ['GET /api/tasks', 'POST /api/takes/sign'] })).toBeNull();
  });
});

describe('selectAnnouncedStaleScope', () => {
  const reorder = {
    method: 'PUT',
    path: '/api/setlists/s1/reorder',
    status: 200,
    rememberedScope: null,
  };

  it('announces the scope of a write that answered with a success', () => {
    expect(selectAnnouncedStaleScope(reorder)).toBe('setlists');
    expect(selectAnnouncedStaleScope({ ...reorder, status: 299 })).toBe('setlists');
  });

  it('announces nothing for a write the API refused or failed', () => {
    expect(selectAnnouncedStaleScope({ ...reorder, status: 199 })).toBeNull();
    expect(selectAnnouncedStaleScope({ ...reorder, status: 300 })).toBeNull();
    expect(selectAnnouncedStaleScope({ ...reorder, status: 409 })).toBeNull();
  });

  it('prefers the scope a handler remembered, which is how an assistant write announces itself', () => {
    expect(
      selectAnnouncedStaleScope({
        method: 'POST',
        path: '/mcp',
        status: 200,
        rememberedScope: 'all',
      }),
    ).toBe('all');
  });

  it('announces nothing for an assistant request that ran no writing tool', () => {
    expect(
      selectAnnouncedStaleScope({
        method: 'POST',
        path: '/mcp',
        status: 200,
        rememberedScope: null,
      }),
    ).toBeNull();
  });
});
