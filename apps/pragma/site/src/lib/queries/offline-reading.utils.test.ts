import { describe, expect, it } from 'vitest';
import { isSignInUpdate, selectOfflineReadingTargets } from './offline-reading.utils';

// @FollowsBlueprint test-pure-unit
describe('selectOfflineReadingTargets', () => {
  it('reads every song identifier and the next session identifier off the manifest URLs', () => {
    expect(
      selectOfflineReadingTargets({
        songDetailUrls: ['/api/songs/song-1', '/api/songs/song-2'],
        nextSessionUrl: '/api/sessions/session-9',
      }),
    ).toStrictEqual({ songIds: ['song-1', 'song-2'], sessionIds: ['session-9'] });
  });

  it('names no session when the band has none planned', () => {
    expect(selectOfflineReadingTargets({ songDetailUrls: [], nextSessionUrl: null })).toStrictEqual(
      { songIds: [], sessionIds: [] },
    );
  });
});

const SESSION_HASH = '["auth","session"]';
const SIGN_IN = {
  eventType: 'updated',
  actionType: 'success',
  queryHash: SESSION_HASH,
  data: { authenticated: true },
} as const;

// @FollowsBlueprint test-pure-unit
describe('isSignInUpdate', () => {
  it('recognises the session probe turning authenticated', () => {
    expect(isSignInUpdate(SIGN_IN, SESSION_HASH)).toBe(true);
  });

  it.each([
    ['another event', { ...SIGN_IN, eventType: 'added' }],
    ['another action', { ...SIGN_IN, actionType: 'fetch' }],
    ['no action', { ...SIGN_IN, actionType: undefined }],
    ['another query', { ...SIGN_IN, queryHash: '["songs","list"]' }],
    ['a signed-out probe', { ...SIGN_IN, data: { authenticated: false } }],
    ['no data', { ...SIGN_IN, data: null }],
    ['a value that is not a probe', { ...SIGN_IN, data: true }],
    ['an object without the field', { ...SIGN_IN, data: {} }],
  ])('ignores %s', (_case, update) => {
    expect(isSignInUpdate(update, SESSION_HASH)).toBe(false);
  });
});
