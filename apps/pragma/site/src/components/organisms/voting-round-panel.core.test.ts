import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  buildVoteAddress,
  selectParticipation,
  selectRoundHistoryLines,
} from './voting-round-panel.core';

const A_CONCERT = 'aaaaaaaa-1111-4111-8111-111111111111';
const RIFF_SONG_ID = 'bbbbbbbb-2222-4222-8222-222222222222';
const UTC_HOUR_START = 11;
const UTC_HOUR_END = 16;
const TIME_ZONE_VARIABLE = 'TZ';
const A_SUMMER_ZONE_TWO_HOURS_AHEAD_OF_UTC = 'Europe/Paris';

// @FollowsBlueprint test-pure-unit
describe('buildVoteAddress', () => {
  it('is the address the room types and the QR code encodes', () => {
    expect(buildVoteAddress('https://pragma.borso.fr', A_CONCERT)).toBe(
      `https://pragma.borso.fr/vote/${A_CONCERT}`,
    );
  });
});

describe('selectRoundHistoryLines', () => {
  const SONGS = [{ id: RIFF_SONG_ID, title: 'Riff' }];
  const A_LOCALE = 'en-GB';
  const OPENED_AT_UTC = '2026-08-26T21:04:00.000Z';
  const OPENED_AT_IN_PARIS = '23:04';

  beforeAll(() => {
    vi.stubEnv(TIME_ZONE_VARIABLE, A_SUMMER_ZONE_TWO_HOURS_AHEAD_OF_UTC);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('shows nothing for a concert that has run no round', () => {
    expect(selectRoundHistoryLines([], SONGS, A_LOCALE)).toEqual([]);
  });

  it('names the winner of a decided round, at the time it opened', () => {
    const lines = selectRoundHistoryLines(
      [{ id: 'r1', openedAt: OPENED_AT_UTC, winningSongId: RIFF_SONG_ID }],
      SONGS,
      A_LOCALE,
    );
    expect(lines).toEqual([
      { roundId: 'r1', openedAtLabel: OPENED_AT_IN_PARIS, winnerTitle: 'Riff' },
    ]);
  });

  it('labels the round on the clock the band is reading, not on the UTC instant', () => {
    const lines = selectRoundHistoryLines(
      [{ id: 'r1', openedAt: OPENED_AT_UTC, winningSongId: RIFF_SONG_ID }],
      SONGS,
      A_LOCALE,
    );
    expect(lines[0]?.openedAtLabel).not.toBe(OPENED_AT_UTC.slice(UTC_HOUR_START, UTC_HOUR_END));
  });

  it('leaves a blank round without a winner rather than inventing one', () => {
    const lines = selectRoundHistoryLines(
      [{ id: 'r2', openedAt: '2026-08-26T21:10:00.000Z', winningSongId: null }],
      SONGS,
      A_LOCALE,
    );
    expect(lines[0]?.winnerTitle).toBe(null);
  });

  it('leaves a winner the catalogue no longer names without a title rather than crashing', () => {
    const lines = selectRoundHistoryLines(
      [{ id: 'r3', openedAt: '2026-08-26T21:20:00.000Z', winningSongId: 'gone' }],
      SONGS,
      A_LOCALE,
    );
    expect(lines[0]?.winnerTitle).toBe(null);
  });
});

describe('selectParticipation', () => {
  it('reports the ballots this round drew against the room the concert holds', () => {
    expect(selectParticipation(30, 120)).toEqual({
      ballotCount: 30,
      capacity: 120,
      sharePercent: 25,
    });
  });

  it('reports no share when the concert carries no capacity to divide by', () => {
    expect(selectParticipation(12, null)).toEqual({
      ballotCount: 12,
      capacity: null,
      sharePercent: null,
    });
  });

  it('reports no share on a capacity of zero rather than dividing by it', () => {
    expect(selectParticipation(4, 0)).toEqual({
      ballotCount: 4,
      capacity: null,
      sharePercent: null,
    });
  });

  it('rounds the share to a whole percent the band can say out loud', () => {
    expect(selectParticipation(1, 3).sharePercent).toBe(33);
  });

  it('is zero, not absent, before anyone in the room has voted', () => {
    expect(selectParticipation(0, 120).sharePercent).toBe(0);
  });
});
