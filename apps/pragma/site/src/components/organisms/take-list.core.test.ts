import { describe, expect, it } from 'vitest';
import type { QueuedTake } from '../../lib/take-queue.core';
import {
  describeTakeRow,
  describeTakeSession,
  mergePendingTakes,
  selectPracticeTakes,
} from './take-list.core';

const LISTED_OCTOBER_18 = {
  id: 'b',
  recordedAt: '2026-10-18T18:00:00.000Z',
  sessionId: 'practice-1',
  durationSeconds: 232,
  authorName: 'Hugo',
  commentCount: 2,
};
const LISTED_OCTOBER_2 = {
  ...LISTED_OCTOBER_18,
  id: 'd',
  recordedAt: '2026-10-02T18:00:00.000Z',
  sessionId: null,
  authorName: null,
  commentCount: 0,
};

const QUEUED: QueuedTake = {
  id: 'c',
  songId: 'song-1',
  sessionId: null,
  recordedAt: '2026-10-14T18:00:00.000Z',
  durationSeconds: 245,
  contentType: 'audio/webm',
  byteLength: 3,
  source: 'live',
  upload: null,
  isUploaded: false,
  wasDeferred: true,
  hasFailed: false,
  isFromPracticeMode: false,
};

const SESSIONS = [
  { id: 'practice-1', kind: 'practice', venue: null },
  { id: 'concert-1', kind: 'concert', venue: 'Le Petit Bain' },
];

// @FollowsBlueprint test-pure-unit
describe('mergePendingTakes', () => {
  it('slots a take waiting on this device among the listed ones, newest first', () => {
    const rows = mergePendingTakes([LISTED_OCTOBER_18, LISTED_OCTOBER_2], [QUEUED], 'song-1');
    expect(rows.map((row) => [row.kind, row.id])).toEqual([
      ['listed', 'b'],
      ['pending', 'c'],
      ['listed', 'd'],
    ]);
    expect(rows[1]?.take).toBe(QUEUED);
    expect(rows[1]?.recordedAt).toBe(QUEUED.recordedAt);
    expect(rows[0]?.take).toBe(LISTED_OCTOBER_18);
    expect(rows[0]?.recordedAt).toBe(LISTED_OCTOBER_18.recordedAt);
  });

  it('marks a take whose upload failed for good', () => {
    const rows = mergePendingTakes([], [{ ...QUEUED, hasFailed: true }], 'song-1');
    expect(rows.map((row) => row.kind)).toEqual(['failed']);
  });

  it('leaves out the takes of other songs', () => {
    expect(mergePendingTakes([], [{ ...QUEUED, songId: 'song-2' }], 'song-1')).toEqual([]);
  });

  it('shows a take once when it is already listed by the server', () => {
    const created = { ...LISTED_OCTOBER_18, id: 'c', recordedAt: QUEUED.recordedAt };
    const rows = mergePendingTakes([created], [QUEUED], 'song-1');
    expect(rows.map((row) => row.kind)).toEqual(['listed']);
  });
});

describe('describeTakeSession', () => {
  it('names a take with no session', () => {
    expect(describeTakeSession(null, SESSIONS)).toEqual({ key: 'takes.noSession', venue: null });
  });

  it('names a practice', () => {
    expect(describeTakeSession('practice-1', SESSIONS)).toEqual({
      key: 'takes.practice',
      venue: null,
    });
  });

  it('names a concert by its venue', () => {
    expect(describeTakeSession('concert-1', SESSIONS)).toEqual({
      key: 'takes.concert',
      venue: 'Le Petit Bain',
    });
  });

  it('names a session it cannot find', () => {
    expect(describeTakeSession('gone', SESSIONS)).toEqual({
      key: 'takes.unknownSession',
      venue: null,
    });
  });
});

describe('describeTakeRow', () => {
  it('shows a listed take with its author, length and comment count', () => {
    const [row] = mergePendingTakes([LISTED_OCTOBER_18], [], 'song-1');
    if (row === undefined) throw new Error('expected one row');
    expect(describeTakeRow(row, SESSIONS)).toEqual({
      isListed: true,
      isPending: false,
      hasFailed: false,
      session: { key: 'takes.practice', venue: null },
      durationSeconds: 232,
      author: { name: 'Hugo' },
      commentCount: 2,
    });
  });

  it('keeps the missing name of a former member for the screen to label', () => {
    const [row] = mergePendingTakes([LISTED_OCTOBER_2], [], 'song-1');
    if (row === undefined) throw new Error('expected one row');
    expect(describeTakeRow(row, SESSIONS).author).toEqual({ name: null });
  });

  it('shows a waiting take with no author, no count, and its state', () => {
    const [pending] = mergePendingTakes([], [QUEUED], 'song-1');
    const [failed] = mergePendingTakes([], [{ ...QUEUED, hasFailed: true }], 'song-1');
    if (pending === undefined || failed === undefined) throw new Error('expected rows');
    expect(describeTakeRow(pending, SESSIONS)).toEqual({
      isListed: false,
      isPending: true,
      hasFailed: false,
      session: { key: 'takes.noSession', venue: null },
      durationSeconds: 245,
      author: null,
      commentCount: null,
    });
    expect(describeTakeRow(failed, SESSIONS)).toMatchObject({
      isPending: false,
      hasFailed: true,
    });
  });

  it('hides a length the browser could not measure', () => {
    const [row] = mergePendingTakes([{ ...LISTED_OCTOBER_18, durationSeconds: 0 }], [], 'song-1');
    if (row === undefined) throw new Error('expected one row');
    expect(describeTakeRow(row, SESSIONS).durationSeconds).toBeNull();
  });
});

describe('selectPracticeTakes', () => {
  const ON_SONG = { ...LISTED_OCTOBER_18, songId: 'song-1' };
  const ON_OTHER_SONG = { ...LISTED_OCTOBER_2, id: 'e', songId: 'song-2' };

  it('lists the current song takes of the session with the ones queued at it, and finds the selected one', () => {
    const takes = selectPracticeTakes({
      sessionTakes: [ON_SONG, ON_OTHER_SONG],
      queuedTakes: [
        { ...QUEUED, id: 'queued-here', sessionId: 'practice-1' },
        { ...QUEUED, id: 'queued-elsewhere', sessionId: 'practice-2' },
      ],
      sessionId: 'practice-1',
      songId: 'song-1',
      selectedTakeId: 'b',
    });
    expect(takes.rows.map((row) => row.id)).toEqual(['b', 'queued-here']);
    expect(takes.selectedTake).toBe(ON_SONG);
  });

  it('selects nothing when the selected take belongs to another song', () => {
    const takes = selectPracticeTakes({
      sessionTakes: [ON_SONG, ON_OTHER_SONG],
      queuedTakes: [],
      sessionId: 'practice-1',
      songId: 'song-1',
      selectedTakeId: 'e',
    });
    expect(takes.selectedTake).toBeNull();
  });
});
