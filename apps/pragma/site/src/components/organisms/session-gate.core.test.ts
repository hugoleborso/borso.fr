import { describe, expect, it } from 'vitest';
import {
  type CachedQuery,
  isBandDataQuery,
  isOpeningExit,
  selectConnectionNote,
  selectOpeningOverlay,
  selectOpeningWait,
  selectSessionGateState,
} from './session-gate.core';

const PROBE_KEY = ['auth', 'session'] as const;
const SONGS_KEY = ['songs', 'list'] as const;

function cachedQuery(
  queryKey: readonly unknown[],
  state: Partial<CachedQuery['state']>,
): CachedQuery {
  return { queryKey, state: { status: 'pending', fetchStatus: 'idle', data: undefined, ...state } };
}

// @FollowsBlueprint test-pure-unit
describe('isBandDataQuery', () => {
  it('counts every query outside the session probe as band data', () => {
    expect(isBandDataQuery(SONGS_KEY)).toBe(true);
    expect(isBandDataQuery(PROBE_KEY)).toBe(false);
    expect(isBandDataQuery([])).toBe(true);
  });
});

// @FollowsBlueprint test-pure-unit
describe('selectOpeningWait', () => {
  it('ends the wait as soon as one band query holds data', () => {
    const queries = [
      cachedQuery(PROBE_KEY, { fetchStatus: 'fetching' }),
      cachedQuery(SONGS_KEY, { status: 'success', data: [] }),
    ];
    expect(selectOpeningWait(queries)).toBe('band-data');
  });

  it('keeps waiting when only the probe holds data', () => {
    const queries = [
      cachedQuery(PROBE_KEY, { status: 'success', data: { authenticated: true } }),
      cachedQuery(SONGS_KEY, { fetchStatus: 'fetching' }),
    ];
    expect(selectOpeningWait(queries)).toBe('reading');
  });

  it('keeps waiting while one read is in flight, even after another failed', () => {
    const queries = [
      cachedQuery(PROBE_KEY, { status: 'error' }),
      cachedQuery(SONGS_KEY, { fetchStatus: 'fetching' }),
    ];
    expect(selectOpeningWait(queries)).toBe('reading');
  });

  it('fails when nothing is in flight, no band data landed and a read failed', () => {
    const queries = [
      cachedQuery(PROBE_KEY, { status: 'error' }),
      cachedQuery(SONGS_KEY, { status: 'error' }),
    ];
    expect(selectOpeningWait(queries)).toBe('failed');
  });

  it('counts a read paused offline as failed, so an offline cold open never waits forever', () => {
    expect(selectOpeningWait([cachedQuery(PROBE_KEY, { fetchStatus: 'paused' })])).toBe('failed');
  });

  it('has not started while the probe sits idle before its observer subscribes', () => {
    expect(selectOpeningWait([cachedQuery(PROBE_KEY, {})])).toBe('not-started');
    expect(selectOpeningWait([])).toBe('not-started');
  });
});

// @FollowsBlueprint test-pure-unit
describe('selectSessionGateState', () => {
  it('asks for a sign-in when the browser holds no marker, whatever the cache holds', () => {
    expect(selectSessionGateState(false, true, 'band-data')).toBe('sign-in-required');
    expect(selectSessionGateState(false, undefined, 'reading')).toBe('sign-in-required');
  });

  it('asks for a sign-in when the probe answers 401', () => {
    expect(selectSessionGateState(true, false, 'band-data')).toBe('sign-in-required');
    expect(selectSessionGateState(true, false, 'reading')).toBe('sign-in-required');
  });

  it('grants the cached screen at once, before the probe answers', () => {
    expect(selectSessionGateState(true, undefined, 'band-data')).toBe('granted');
    expect(selectSessionGateState(true, true, 'band-data')).toBe('granted');
  });

  it('opens behind the mark while the first reads are on their way', () => {
    expect(selectSessionGateState(true, undefined, 'reading')).toBe('opening');
    expect(selectSessionGateState(true, true, 'not-started')).toBe('opening');
  });

  it('shows the failure when the first reads gave up, the probe included', () => {
    expect(selectSessionGateState(true, undefined, 'failed')).toBe('opening-failed');
    expect(selectSessionGateState(true, true, 'failed')).toBe('opening-failed');
  });
});

// @FollowsBlueprint test-pure-unit
describe('selectOpeningOverlay', () => {
  it('draws nothing over a sign-in redirect', () => {
    expect(selectOpeningOverlay('sign-in-required', false, true, false)).toBeNull();
  });

  it('keeps the mark hidden while the persisted cache is restoring', () => {
    expect(selectOpeningOverlay('opening', true, false, false)).toBe('restoring');
    expect(selectOpeningOverlay('opening-failed', true, false, false)).toBe('restoring');
  });

  it('shows the wait or its failure once the restore is done', () => {
    expect(selectOpeningOverlay('opening', false, false, false)).toBe('opening');
    expect(selectOpeningOverlay('opening-failed', false, true, false)).toBe('opening-failed');
  });

  it('plays the exit only after the mark was seen moving, and only once', () => {
    expect(selectOpeningOverlay('granted', false, true, false)).toBe('leaving');
    expect(selectOpeningOverlay('granted', false, true, true)).toBeNull();
  });

  it('renders a warm open at once, with no exit, when the mark never moved', () => {
    expect(selectOpeningOverlay('granted', false, false, false)).toBeNull();
    expect(selectOpeningOverlay('granted', false, false, true)).toBeNull();
  });
});

// @FollowsBlueprint test-pure-unit
describe('isOpeningExit', () => {
  it('recognises the exit among the animations that end inside the overlay', () => {
    expect(isOpeningExit('downbeat-exit')).toBe(true);
    expect(isOpeningExit('downbeat-enter-left')).toBe(false);
  });
});

// @FollowsBlueprint test-pure-unit
describe('selectConnectionNote', () => {
  it('names the offline note only when the browser is offline', () => {
    expect(selectConnectionNote(true)).toBe('online');
    expect(selectConnectionNote(false)).toBe('offline');
  });
});
