import { describe, expect, it } from 'vitest';
import {
  isRoundOpen,
  remainingSeconds,
  ROUND_DURATION_MS,
  type RoundWindow,
  selectRoundClosesAt,
  selectSettlementWrite,
  settleRound,
  type SurvivingVote,
} from './round.core';

const OPENED_AT = new Date('2026-08-26T20:00:00.000Z');
const CLOSES_AT = new Date('2026-08-26T20:00:30.000Z');
const ONE_MILLISECOND = 1;

const RIFF_SONG_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const BALLAD_SONG_ID = 'bbbbbbbb-2222-4222-8222-222222222222';
const ENCORE_SONG_ID = 'cccccccc-3333-4333-8333-333333333333';

function openRound(): RoundWindow {
  return { closesAt: CLOSES_AT, settledAt: null };
}

function voteAt(songId: string, isoInstant: string): SurvivingVote {
  return { songId, castAt: new Date(isoInstant) };
}

// @FollowsBlueprint test-pure-unit
describe('the round window', () => {
  it('closes thirty seconds after it opened', () => {
    expect(selectRoundClosesAt(OPENED_AT).getTime() - OPENED_AT.getTime()).toBe(ROUND_DURATION_MS);
  });

  it('is open before the close and shut at the close instant itself', () => {
    expect(isRoundOpen(openRound(), new Date(CLOSES_AT.getTime() - ONE_MILLISECOND))).toBe(true);
    expect(isRoundOpen(openRound(), CLOSES_AT)).toBe(false);
  });

  it('is shut once settled, however early the clock says it is', () => {
    expect(isRoundOpen({ closesAt: CLOSES_AT, settledAt: OPENED_AT }, OPENED_AT)).toBe(false);
  });

  it('counts the remaining seconds up, and never below zero', () => {
    expect(remainingSeconds(openRound(), OPENED_AT)).toBe(30);
    expect(remainingSeconds(openRound(), new Date(CLOSES_AT.getTime() - 1_500))).toBe(2);
    expect(remainingSeconds(openRound(), new Date(CLOSES_AT.getTime() + 5_000))).toBe(0);
  });
});

describe('settling a round', () => {
  it('leaves a round that has not reached its close alone', () => {
    const settlement = settleRound({
      round: openRound(),
      votes: [voteAt(RIFF_SONG_ID, '2026-08-26T20:00:10.000Z')],
      now: new Date(CLOSES_AT.getTime() - ONE_MILLISECOND),
    });
    expect(settlement).toEqual({ kind: 'still-open' });
  });

  it('settles on the vote one millisecond past the close', () => {
    const settlement = settleRound({
      round: openRound(),
      votes: [voteAt(RIFF_SONG_ID, '2026-08-26T20:00:10.000Z')],
      now: new Date(CLOSES_AT.getTime() + ONE_MILLISECOND),
    });
    expect(settlement).toEqual({ kind: 'winner', songId: RIFF_SONG_ID });
  });

  it('answers already-settled the second time, so a settlement that runs twice changes nothing', () => {
    const votes = [voteAt(RIFF_SONG_ID, '2026-08-26T20:00:10.000Z')];
    const first = settleRound({ round: openRound(), votes, now: CLOSES_AT });
    const second = settleRound({
      round: { closesAt: CLOSES_AT, settledAt: CLOSES_AT },
      votes,
      now: CLOSES_AT,
    });
    expect(first).toEqual({ kind: 'winner', songId: RIFF_SONG_ID });
    expect(second).toEqual({ kind: 'already-settled' });
  });

  it('is blank when the room cast nothing', () => {
    expect(settleRound({ round: openRound(), votes: [], now: CLOSES_AT })).toEqual({
      kind: 'blank',
    });
  });

  it('gives the win to the song with the most surviving votes', () => {
    const settlement = settleRound({
      round: openRound(),
      votes: [
        voteAt(RIFF_SONG_ID, '2026-08-26T20:00:01.000Z'),
        voteAt(BALLAD_SONG_ID, '2026-08-26T20:00:02.000Z'),
        voteAt(BALLAD_SONG_ID, '2026-08-26T20:00:03.000Z'),
      ],
      now: CLOSES_AT,
    });
    expect(settlement).toEqual({ kind: 'winner', songId: BALLAD_SONG_ID });
  });

  it('breaks a tie on the song whose latest surviving vote is the earliest', () => {
    const settlement = settleRound({
      round: openRound(),
      votes: [
        voteAt(RIFF_SONG_ID, '2026-08-26T20:00:01.000Z'),
        voteAt(RIFF_SONG_ID, '2026-08-26T20:00:04.000Z'),
        voteAt(BALLAD_SONG_ID, '2026-08-26T20:00:02.000Z'),
        voteAt(BALLAD_SONG_ID, '2026-08-26T20:00:09.000Z'),
      ],
      now: CLOSES_AT,
    });
    expect(settlement).toEqual({ kind: 'winner', songId: RIFF_SONG_ID });
  });

  it('reshuffles the same tie once a retraction removes the vote that had decided it', () => {
    const retractedVote = voteAt(RIFF_SONG_ID, '2026-08-26T20:00:01.000Z');
    const beforeRetraction: SurvivingVote[] = [
      retractedVote,
      voteAt(RIFF_SONG_ID, '2026-08-26T20:00:04.000Z'),
      voteAt(BALLAD_SONG_ID, '2026-08-26T20:00:02.000Z'),
      voteAt(BALLAD_SONG_ID, '2026-08-26T20:00:09.000Z'),
    ];
    const afterRetraction = beforeRetraction.filter((vote) => vote !== retractedVote);

    expect(settleRound({ round: openRound(), votes: beforeRetraction, now: CLOSES_AT })).toEqual({
      kind: 'winner',
      songId: RIFF_SONG_ID,
    });
    expect(afterRetraction).toHaveLength(beforeRetraction.length - 1);
    expect(settleRound({ round: openRound(), votes: afterRetraction, now: CLOSES_AT })).toEqual({
      kind: 'winner',
      songId: BALLAD_SONG_ID,
    });
  });

  it('is a function of its inputs when count and latest vote are both tied', () => {
    const sameInstant = '2026-08-26T20:00:05.000Z';
    const oneOrder = settleRound({
      round: openRound(),
      votes: [voteAt(ENCORE_SONG_ID, sameInstant), voteAt(BALLAD_SONG_ID, sameInstant)],
      now: CLOSES_AT,
    });
    const otherOrder = settleRound({
      round: openRound(),
      votes: [voteAt(BALLAD_SONG_ID, sameInstant), voteAt(ENCORE_SONG_ID, sameInstant)],
      now: CLOSES_AT,
    });
    expect(oneOrder).toEqual({ kind: 'winner', songId: BALLAD_SONG_ID });
    expect(otherOrder).toEqual(oneOrder);
  });
});

describe('what a settlement asks the database to write', () => {
  it('writes nothing while the round is open or already settled', () => {
    expect(selectSettlementWrite({ kind: 'still-open' })).toEqual({
      shouldClaimTheRound: false,
      winningSongId: null,
    });
    expect(selectSettlementWrite({ kind: 'already-settled' })).toEqual({
      shouldClaimTheRound: false,
      winningSongId: null,
    });
  });

  it('closes a blank round without naming a winner, so another round may open', () => {
    expect(selectSettlementWrite({ kind: 'blank' })).toEqual({
      shouldClaimTheRound: true,
      winningSongId: null,
    });
  });

  it('closes a decided round on its winner', () => {
    expect(selectSettlementWrite({ kind: 'winner', songId: RIFF_SONG_ID })).toEqual({
      shouldClaimTheRound: true,
      winningSongId: RIFF_SONG_ID,
    });
  });
});
