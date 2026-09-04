import { describe, expect, it } from 'vitest';
import {
  buildShortVoteAddress,
  buildVoteAddress,
  selectParticipation,
  selectRoundHistoryLines,
  selectRoundOutcome,
} from './voting-round-panel.core';
import type { RoundHistoryRow } from './voting-round-panel.core';

const A_CONCERT = 'aaaaaaaa-1111-4111-8111-111111111111';
const RIFF_SONG_ID = 'bbbbbbbb-2222-4222-8222-222222222222';
const FRENCH = 'fr';
const ENGLISH = 'en';

function round(overrides: Partial<RoundHistoryRow> = {}): RoundHistoryRow {
  return {
    id: 'r1',
    openedAt: '2026-08-26T21:04:00.000Z',
    isSettled: true,
    winningSongId: RIFF_SONG_ID,
    winningSongTitle: 'Riff',
    ...overrides,
  };
}

// @FollowsBlueprint test-pure-unit
describe('buildVoteAddress', () => {
  it('is the address the room types and the QR code encodes', () => {
    expect(buildVoteAddress('https://pragma.borso.fr', A_CONCERT)).toBe(
      `https://pragma.borso.fr/vote/${A_CONCERT}`,
    );
  });
});

describe('buildShortVoteAddress', () => {
  it('is sayable at a microphone, so it drops the scheme the long address keeps', () => {
    expect(buildShortVoteAddress('https://pragma.borso.fr')).toBe('pragma.borso.fr/vote');
  });

  it('keeps the port, which a preview host needs and a listener has to hear', () => {
    expect(buildShortVoteAddress('http://localhost:5173')).toBe('localhost:5173/vote');
  });

  it('names no concert, because the server resolves the live one', () => {
    expect(buildShortVoteAddress('https://pragma.borso.fr')).not.toContain(A_CONCERT);
  });
});

describe('selectRoundOutcome', () => {
  it('calls a round still running in progress, never blank, however few votes are in', () => {
    const outcome = selectRoundOutcome(
      round({ isSettled: false, winningSongId: null, winningSongTitle: null }),
    );
    expect(outcome).toEqual({ kind: 'running' });
    expect(outcome.kind).not.toBe('blank');
  });

  it('calls a round nobody voted in blank', () => {
    expect(
      selectRoundOutcome(round({ isSettled: true, winningSongId: null, winningSongTitle: null })),
    ).toEqual({ kind: 'blank' });
  });

  it('names the winner when the round has one', () => {
    expect(selectRoundOutcome(round({ winningSongTitle: 'Riff' }))).toEqual({
      kind: 'won',
      title: 'Riff',
    });
  });

  it('never calls a round with a winner blank, even when the title is missing', () => {
    const outcome = selectRoundOutcome(round({ winningSongTitle: null }));
    expect(outcome).toEqual({ kind: 'won-unnamed' });
    expect(outcome.kind).not.toBe('blank');
  });

  it('separates a blank round from a won one whose title is unknown', () => {
    const blank = selectRoundOutcome(
      round({ isSettled: true, winningSongId: null, winningSongTitle: null }),
    );
    const unnamed = selectRoundOutcome(round({ winningSongTitle: null }));
    expect(blank.kind).not.toBe(unnamed.kind);
  });
});

describe('selectRoundHistoryLines', () => {
  const OPENED_AT = '2026-08-26T21:04:00.000Z';
  const TWENTY_FOUR_HOUR_LABEL = /^\d{2}:\d{2}$/;
  const TWELVE_HOUR_LABEL = /^\d{2}:\d{2}\s?(AM|PM)$/;

  function labelOfOneRound(locale: string): string {
    const lines = selectRoundHistoryLines([round({ openedAt: OPENED_AT })], locale);
    return lines[0]?.openedAtLabel ?? '';
  }

  it('shows nothing for a concert that has run no round', () => {
    expect(selectRoundHistoryLines([], FRENCH)).toEqual([]);
  });

  it('names the winner of a decided round', () => {
    const lines = selectRoundHistoryLines([round({ openedAt: OPENED_AT })], FRENCH);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.roundId).toBe('r1');
    expect(lines[0]?.outcome).toEqual({ kind: 'won', title: 'Riff' });
  });

  it('labels the round through the viewer own locale, not by cutting the UTC string', () => {
    expect(labelOfOneRound(FRENCH)).toMatch(TWENTY_FOUR_HOUR_LABEL);
    expect(labelOfOneRound(ENGLISH)).toMatch(TWELVE_HOUR_LABEL);
    expect(labelOfOneRound(ENGLISH)).not.toBe(labelOfOneRound(FRENCH));
  });

  it('carries a round won by a song suggested from the room, which no earlier read knew', () => {
    const lines = selectRoundHistoryLines(
      [round({ id: 'r4', winningSongId: 'just-created', winningSongTitle: 'Hallelujah' })],
      FRENCH,
    );
    expect(lines[0]?.outcome).toEqual({ kind: 'won', title: 'Hallelujah' });
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
