import { describe, expect, it } from 'vitest';
import {
  isSilentWrite,
  mergeWrittenRoots,
  readWrittenRoots,
  selectAnnouncedWrittenRoots,
  selectToolWrittenRoots,
  selectWrittenRoot,
} from './stale-scope.core';

// @FollowsBlueprint test-pure-unit
describe('selectWrittenRoot', () => {
  it('names the API root of a write, the first segment after /api/', () => {
    expect(selectWrittenRoot('PUT', '/api/setlists/s1/reorder')).toBe('setlists');
    expect(selectWrittenRoot('PUT', '/api/setlists/s1/votes/song-1')).toBe('setlists');
    expect(selectWrittenRoot('PUT', '/api/mastery/overrides')).toBe('mastery');
    expect(selectWrittenRoot('DELETE', '/api/songs/song-1')).toBe('songs');
  });

  it('names me for a member contact and a calendar feed, which live under me', () => {
    expect(selectWrittenRoot('PUT', '/api/me/contact')).toBe('me');
    expect(selectWrittenRoot('POST', '/api/me/calendar-feeds')).toBe('me');
  });

  it('names nothing for a write that changes no band data another member reads', () => {
    expect(selectWrittenRoot('POST', '/api/auth/login')).toBeNull();
    expect(selectWrittenRoot('POST', '/api/me/passkeys')).toBeNull();
    expect(selectWrittenRoot('PUT', '/api/me/password')).toBeNull();
    expect(selectWrittenRoot('POST', '/api/takes/sign')).toBeNull();
    expect(selectWrittenRoot('POST', '/mcp')).toBeNull();
  });

  it('names nothing for a read, whatever the path', () => {
    expect(selectWrittenRoot('GET', '/api/setlists/s1')).toBeNull();
    expect(selectWrittenRoot('head', '/api/setlists')).toBeNull();
  });

  it('names nothing for a root no announced write touches, or a path outside /api/', () => {
    expect(selectWrittenRoot('POST', '/api/unknown')).toBeNull();
    expect(selectWrittenRoot('POST', '/api')).toBeNull();
    expect(selectWrittenRoot('POST', '/setlists/s1')).toBeNull();
    expect(selectWrittenRoot('POST', '/v2/setlists')).toBeNull();
  });

  it('ignores the empty segments a leading or doubled slash leaves', () => {
    expect(selectWrittenRoot('POST', '//api//tasks/')).toBe('tasks');
  });
});

describe('isSilentWrite', () => {
  it('matches a silent path and every path below it, and nothing beside it', () => {
    expect(isSilentWrite('/api/takes/sign')).toBe(true);
    expect(isSilentWrite('/api/takes/sign/extra')).toBe(true);
    expect(isSilentWrite('/api/takes/t1')).toBe(false);
    expect(isSilentWrite('/api')).toBe(false);
  });
});

describe('selectToolWrittenRoots', () => {
  it('names each root the write routes of a tool touch, once', () => {
    expect(
      selectToolWrittenRoots({
        routes: ['GET /api/setlists/:id', 'PUT /api/setlists/:id/reorder', 'POST /api/setlists'],
      }),
    ).toStrictEqual(['setlists']);
    expect(
      selectToolWrittenRoots({ routes: ['PUT /api/songs/:id', 'PUT /api/mastery/overrides'] }),
    ).toStrictEqual(['songs', 'mastery']);
  });

  it('names nothing for a tool that only reads, or whose routes carry no method', () => {
    expect(
      selectToolWrittenRoots({ routes: ['GET /api/tasks', 'POST /api/takes/sign'] }),
    ).toStrictEqual([]);
    expect(selectToolWrittenRoots({ routes: ['/api/setlists'] })).toStrictEqual([]);
  });
});

describe('mergeWrittenRoots and readWrittenRoots', () => {
  it('keeps each root once, in the order it was first remembered', () => {
    expect(mergeWrittenRoots(['tasks', 'songs'], ['songs', 'mastery'])).toStrictEqual([
      'tasks',
      'songs',
      'mastery',
    ]);
  });

  it('reads back only the written roots of a remembered list', () => {
    expect(readWrittenRoots(['tasks', 'auth', 42])).toStrictEqual(['tasks']);
    expect(readWrittenRoots(undefined)).toStrictEqual([]);
    expect(readWrittenRoots('tasks')).toStrictEqual([]);
  });
});

describe('selectAnnouncedWrittenRoots', () => {
  const reorder = {
    method: 'PUT',
    path: '/api/setlists/s1/reorder',
    status: 200,
    rememberedRoots: [],
  };

  it('announces the root of a write that answered with a success', () => {
    expect(selectAnnouncedWrittenRoots(reorder)).toStrictEqual(['setlists']);
    expect(selectAnnouncedWrittenRoots({ ...reorder, status: 299 })).toStrictEqual(['setlists']);
  });

  it('announces nothing for a write the API refused or failed', () => {
    expect(selectAnnouncedWrittenRoots({ ...reorder, status: 199 })).toStrictEqual([]);
    expect(selectAnnouncedWrittenRoots({ ...reorder, status: 300 })).toStrictEqual([]);
    expect(selectAnnouncedWrittenRoots({ ...reorder, status: 409 })).toStrictEqual([]);
  });

  it('prefers the roots a handler remembered, which is how an assistant write announces itself', () => {
    expect(
      selectAnnouncedWrittenRoots({
        method: 'POST',
        path: '/mcp',
        status: 200,
        rememberedRoots: ['tasks', 'songs'],
      }),
    ).toStrictEqual(['tasks', 'songs']);
  });

  it('announces nothing for an assistant request that ran no writing tool', () => {
    expect(
      selectAnnouncedWrittenRoots({
        method: 'POST',
        path: '/mcp',
        status: 200,
        rememberedRoots: [],
      }),
    ).toStrictEqual([]);
  });
});
