import { describe, expect, it } from 'vitest';
import { buildPoolEntries, type PoolCandidateSong, selectPool, tallyVotes } from './pool.core';

const RIFF_SONG_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const BALLAD_SONG_ID = 'bbbbbbbb-2222-4222-8222-222222222222';
const INVENTED_SONG_ID = 'cccccccc-3333-4333-8333-333333333333';

const RIFF: PoolCandidateSong = {
  id: RIFF_SONG_ID,
  title: 'Riff',
  artist: 'The Band',
  status: 'concert_ready',
};
const BALLAD: PoolCandidateSong = {
  id: BALLAD_SONG_ID,
  title: 'Ballad',
  artist: 'The Band',
  status: 'concert_ready',
};
const INVENTED: PoolCandidateSong = {
  id: INVENTED_SONG_ID,
  title: 'Invented',
  artist: 'Someone Else',
  status: 'idea',
};

const EMPTY: readonly string[] = [];

function poolOf(params: {
  catalogSongs: readonly PoolCandidateSong[];
  manualSetlistSongIds?: readonly string[];
  suggestedSongIds?: readonly string[];
  previousWinnerSongIds?: readonly string[];
}): string[] {
  return selectPool({
    catalogSongs: params.catalogSongs,
    manualSetlistSongIds: params.manualSetlistSongIds ?? EMPTY,
    suggestedSongIds: params.suggestedSongIds ?? EMPTY,
    previousWinnerSongIds: params.previousWinnerSongIds ?? EMPTY,
  }).map((song) => song.id);
}

// @FollowsBlueprint test-pure-unit
describe('selecting the pool', () => {
  it('carries a concert-ready song the band has not planned for tonight', () => {
    expect(poolOf({ catalogSongs: [RIFF] })).toEqual([RIFF_SONG_ID]);
  });

  it('leaves out a song that is not concert-ready and was never suggested', () => {
    expect(poolOf({ catalogSongs: [INVENTED] })).toEqual([]);
  });

  it('leaves out a concert-ready song already in a manual setlist attached to this concert', () => {
    expect(poolOf({ catalogSongs: [RIFF], manualSetlistSongIds: [RIFF_SONG_ID] })).toEqual([]);
  });

  it('drops a previous winner even when no manual setlist names it, so the two rules stay apart', () => {
    expect(
      poolOf({
        catalogSongs: [RIFF, BALLAD],
        manualSetlistSongIds: [BALLAD_SONG_ID],
        previousWinnerSongIds: [RIFF_SONG_ID],
      }),
    ).toEqual([]);
    expect(
      poolOf({ catalogSongs: [RIFF, BALLAD], manualSetlistSongIds: [BALLAD_SONG_ID] }),
    ).toEqual([RIFF_SONG_ID]);
  });

  it('carries a song suggested from the room whatever its status', () => {
    expect(poolOf({ catalogSongs: [INVENTED], suggestedSongIds: [INVENTED_SONG_ID] })).toEqual([
      INVENTED_SONG_ID,
    ]);
  });

  it('drops a song that won an earlier round, suggested or not', () => {
    expect(
      poolOf({
        catalogSongs: [RIFF, INVENTED],
        suggestedSongIds: [INVENTED_SONG_ID],
        previousWinnerSongIds: [RIFF_SONG_ID, INVENTED_SONG_ID],
      }),
    ).toEqual([]);
  });
});

describe('tallying votes', () => {
  it('counts nothing for a round nobody voted in', () => {
    expect([...tallyVotes([])]).toEqual([]);
  });

  it('counts one row per vote, per song', () => {
    const tally = tallyVotes([
      { songId: RIFF_SONG_ID },
      { songId: BALLAD_SONG_ID },
      { songId: RIFF_SONG_ID },
    ]);
    expect(tally.get(RIFF_SONG_ID)).toBe(2);
    expect(tally.get(BALLAD_SONG_ID)).toBe(1);
  });
});

describe('building the pool entries', () => {
  it('marks a suggested song and leaves a catalogue song unmarked', () => {
    const ordered = buildPoolEntries([RIFF, INVENTED], tallyVotes([]), [INVENTED_SONG_ID]);
    expect(ordered.map((entry) => [entry.songId, entry.isSuggestion, entry.status])).toEqual([
      [INVENTED_SONG_ID, true, 'idea'],
      [RIFF_SONG_ID, false, 'concert_ready'],
    ]);
  });

  it('orders on the standing first and on the title when the standing ties', () => {
    const ordered = buildPoolEntries(
      [RIFF, BALLAD, INVENTED],
      tallyVotes([{ songId: INVENTED_SONG_ID }]),
      EMPTY,
    );
    expect(ordered.map((entry) => entry.title)).toEqual(['Invented', 'Ballad', 'Riff']);
  });

  it('reports zero for a song nobody has voted for yet', () => {
    const ordered = buildPoolEntries([RIFF], tallyVotes([]), EMPTY);
    expect(ordered[0]?.voteCount).toBe(0);
  });
});
