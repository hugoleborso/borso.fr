import { type ScoredEntry, selectTricksTaken } from './scoring.core';

export const ROUND_COUNT = 10;
export const MINIMUM_PLAYERS = 3;
export const MAXIMUM_PLAYERS = 8;
const BASE_DECK_SIZE = 70;

export const ROUND_PHASES = ['bidding', 'scoring', 'finished'] as const;
export type RoundPhase = (typeof ROUND_PHASES)[number];

// @FollowsBlueprint domain-shared-selection
export function selectCardCount(roundNumber: number, playerCount: number): number {
  return Math.min(roundNumber, Math.floor(BASE_DECK_SIZE / playerCount));
}

export interface RoundDiscards {
  readonly isKrakenPlayed: boolean;
  readonly isWhiteWhaleDiscard: boolean;
}

export function selectExpectedTricks(cardCount: number, discards: RoundDiscards): number {
  const discarded = Number(discards.isKrakenPlayed) + Number(discards.isWhiteWhaleDiscard);
  return cardCount - discarded;
}

export type TrickTally =
  | { readonly kind: 'incomplete' }
  | { readonly kind: 'balanced'; readonly counted: number }
  | { readonly kind: 'unbalanced'; readonly counted: number; readonly expected: number };

export function tallyTricks(
  entries: readonly ScoredEntry[],
  cardCount: number,
  discards: RoundDiscards,
): TrickTally {
  const taken = entries.map(selectTricksTaken).filter((tricks) => tricks !== null);
  if (taken.length < entries.length) return { kind: 'incomplete' };
  const counted = taken.reduce((total, tricks) => total + tricks, 0);
  const expected = selectExpectedTricks(cardCount, discards);
  return counted === expected
    ? { kind: 'balanced', counted }
    : { kind: 'unbalanced', counted, expected };
}

export function isEveryBidPlaced(entries: readonly ScoredEntry[]): boolean {
  return entries.every((entry) => entry.bid !== null);
}

export function isBidAdjustedOnce(entries: readonly ScoredEntry[]): boolean {
  return entries.filter((entry) => entry.bidAdjustment !== 0).length <= 1;
}

export function isRascalBetOnce(entries: readonly ScoredEntry[]): boolean {
  return entries.filter((entry) => entry.rascalBet !== 0).length <= 1;
}

export function canCloseRound(tally: TrickTally): boolean {
  return tally.kind === 'balanced';
}
