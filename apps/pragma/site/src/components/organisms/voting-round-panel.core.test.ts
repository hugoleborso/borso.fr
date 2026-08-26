import { describe, expect, it } from 'vitest';
import { buildVoteAddress, selectRoundHistoryLines } from './voting-round-panel.core';

const A_CONCERT = 'aaaaaaaa-1111-4111-8111-111111111111';
const RIFF_SONG_ID = 'bbbbbbbb-2222-4222-8222-222222222222';

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

  it('shows nothing for a concert that has run no round', () => {
    expect(selectRoundHistoryLines([], SONGS)).toEqual([]);
  });

  it('names the winner of a decided round, at the time it opened', () => {
    const lines = selectRoundHistoryLines(
      [{ id: 'r1', openedAt: '2026-08-26T21:04:00.000Z', winningSongId: RIFF_SONG_ID }],
      SONGS,
    );
    expect(lines).toEqual([{ roundId: 'r1', openedAtLabel: '21:04', winnerTitle: 'Riff' }]);
  });

  it('leaves a blank round without a winner rather than inventing one', () => {
    const lines = selectRoundHistoryLines(
      [{ id: 'r2', openedAt: '2026-08-26T21:10:00.000Z', winningSongId: null }],
      SONGS,
    );
    expect(lines[0]?.winnerTitle).toBe(null);
  });

  it('leaves a winner the catalogue no longer names without a title rather than crashing', () => {
    const lines = selectRoundHistoryLines(
      [{ id: 'r3', openedAt: '2026-08-26T21:20:00.000Z', winningSongId: 'gone' }],
      SONGS,
    );
    expect(lines[0]?.winnerTitle).toBe(null);
  });
});
