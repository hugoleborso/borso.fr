import { type BidAdjustment, isBidMade, NO_BONUS, selectFinalBid } from '@domain/scoring.core';
import {
  canCloseRound,
  isBidAdjustedOnce,
  isRascalBetOnce,
  ROUND_COUNT,
  type RoundPhase,
  selectExpectedTricks,
  tallyTricks,
  type TrickTally,
} from '@domain/round.core';
import type { EntryEdit } from './game-edits.core';
import { formatSignedPoints } from './game-scores.core';
import type { GameEntry, GameRound, GameView } from './game-view.core';

export interface TallyDisplay {
  readonly counted: string;
  readonly isBalanced: boolean;
}

export interface RoundCheck extends TallyDisplay {
  readonly expected: number;
}

const UNKNOWN_COUNT = '?';

// @FollowsBlueprint utils-pure-module
export function selectTallyDisplay(tally: TrickTally): TallyDisplay {
  if (tally.kind === 'incomplete') return { counted: UNKNOWN_COUNT, isBalanced: false };
  return { counted: String(tally.counted), isBalanced: canCloseRound(tally) };
}

export function isAwaitingTricks(entry: GameEntry): boolean {
  return entry.isMissed && entry.tricks === null;
}

export function selectMadeToggleEdit(entry: GameEntry): EntryEdit {
  return entry.isMissed ? { isMissed: false, tricks: null } : { isMissed: true };
}

export function selectTricksCorrection(value: number, finalBid: number | null): EntryEdit {
  return value === finalBid ? { isMissed: false, tricks: null } : { isMissed: true, tricks: value };
}

export function selectClosingMove(roundNumber: number): {
  readonly round: number;
  readonly phase: RoundPhase;
} {
  return roundNumber < ROUND_COUNT
    ? { round: roundNumber + 1, phase: 'bidding' }
    : { round: roundNumber, phase: 'finished' };
}

export function selectRoundCheck(round: GameRound): RoundCheck {
  const tally = tallyTricks(round.entries, round.cardCount, round);
  return {
    ...selectTallyDisplay(tally),
    expected: selectExpectedTricks(round.cardCount, round),
  };
}

export function hasUnbalancedClosedRound(game: GameView): boolean {
  return game.rounds.some(
    (round) => round.number < game.currentRound && !selectRoundCheck(round).isBalanced,
  );
}

const NO_BID = '\u2013';
const ADJUSTED_TO = '\u2192';

export function formatBid(entry: GameEntry): string {
  if (entry.bid === null) return NO_BID;
  if (entry.bidAdjustment === 0) return String(entry.bid);
  return `${String(entry.bid)}${ADJUSTED_TO}${String(selectFinalBid(entry))}`;
}

export function formatBidAdjustment(adjustment: BidAdjustment): string | null {
  return adjustment === 0 ? null : formatSignedPoints(adjustment);
}

function withEntry(entries: readonly GameEntry[], changed: GameEntry): readonly GameEntry[] {
  return entries.map((entry) => (entry.playerId === changed.playerId ? changed : entry));
}

export function isHarryLocked(entries: readonly GameEntry[], entry: GameEntry): boolean {
  return (
    entry.bidAdjustment === 0 &&
    !isBidAdjustedOnce(withEntry(entries, { ...entry, bidAdjustment: 1 }))
  );
}

export function isRascalLocked(entries: readonly GameEntry[], entry: GameEntry): boolean {
  return entry.rascalBet === 0 && !isRascalBetOnce(withEntry(entries, { ...entry, rascalBet: 10 }));
}

export function formatRascalBadge(entry: GameEntry): string | null {
  if (entry.rascalBet === 0) return null;
  return formatSignedPoints(isBidMade(entry) ? entry.rascalBet : -entry.rascalBet);
}

export function selectRoundEntries(
  round: GameRound,
  playerIds: readonly string[],
): readonly GameEntry[] {
  return playerIds.map(
    (playerId) =>
      round.entries.find((entry) => entry.playerId === playerId) ?? {
        playerId,
        bid: null,
        bidAdjustment: 0,
        rascalBet: 0,
        isMissed: false,
        tricks: null,
        bonuses: NO_BONUS,
      },
  );
}
