import { describe, expect, it } from 'vitest';
import {
  buildSetlistSummaries,
  selectNextLinkPosition,
  tallySongsPerSetlist,
} from './setlists.core';

describe('selectNextLinkPosition', () => {
  it('puts the first setlist of a session at zero', () => {
    expect(selectNextLinkPosition(null)).toBe(0);
  });

  it('puts the next one past the highest already taken', () => {
    expect(selectNextLinkPosition(2)).toBe(3);
  });
});

describe('tallySongsPerSetlist', () => {
  it('counts the rows of each setlist', () => {
    expect(
      tallySongsPerSetlist(
        ['a', 'b'],
        [{ setlistId: 'a' }, { setlistId: 'b' }, { setlistId: 'a' }],
      ),
    ).toEqual([
      { setlistId: 'a', songCount: 2 },
      { setlistId: 'b', songCount: 1 },
    ]);
  });

  it('answers zero for a setlist holding no song', () => {
    expect(tallySongsPerSetlist(['empty'], [])).toEqual([{ setlistId: 'empty', songCount: 0 }]);
  });

  it('ignores a row belonging to a setlist not asked for', () => {
    expect(tallySongsPerSetlist(['a'], [{ setlistId: 'other' }])).toEqual([
      { setlistId: 'a', songCount: 0 },
    ]);
  });

  it('keeps the order asked for', () => {
    expect(tallySongsPerSetlist(['b', 'a'], []).map((count) => count.setlistId)).toEqual([
      'b',
      'a',
    ]);
  });
});

describe('buildSetlistSummaries', () => {
  it('carries the song count and the sessions of each setlist', () => {
    expect(
      buildSetlistSummaries(
        [
          { id: 'a', name: 'Set 1' },
          { id: 'b', name: 'Set 2' },
        ],
        [
          { setlistId: 'a', songCount: 3 },
          { setlistId: 'b', songCount: 0 },
        ],
        [
          { setlistId: 'a', sessionId: 'concert-1' },
          { setlistId: 'a', sessionId: 'practice-1' },
        ],
      ),
    ).toEqual([
      { id: 'a', name: 'Set 1', songCount: 3, sessionIds: ['concert-1', 'practice-1'] },
      { id: 'b', name: 'Set 2', songCount: 0, sessionIds: [] },
    ]);
  });

  it('reads a setlist with no counted row as empty', () => {
    expect(buildSetlistSummaries([{ id: 'a', name: '' }], [], [])).toEqual([
      { id: 'a', name: '', songCount: 0, sessionIds: [] },
    ]);
  });

  it('ignores a link pointing at a setlist outside the list', () => {
    expect(
      buildSetlistSummaries([{ id: 'a', name: '' }], [], [{ setlistId: 'z', sessionId: 's' }]),
    ).toEqual([{ id: 'a', name: '', songCount: 0, sessionIds: [] }]);
  });
});
