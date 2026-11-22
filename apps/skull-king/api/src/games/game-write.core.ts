import type { GameErrorCode } from '@domain/game-error.core';
import {
  canCloseRound,
  isEveryBidPlaced,
  type RoundDiscards,
  type RoundPhase,
  selectCardCount,
  tallyTricks,
} from '@domain/round.core';
import {
  type BidAdjustment,
  type BonusCounts,
  NO_BONUS,
  type RascalBet,
  type ScoredEntry,
} from '@domain/scoring.core';

export interface EntryWriteFacts {
  readonly roundNumber: number;
  readonly currentRound: number;
  readonly seatedPlayerIds: readonly string[];
  readonly playerId: string;
  readonly bid: number | null | undefined;
  readonly bidAdjustment: BidAdjustment | null | undefined;
  readonly rascalBet: RascalBet | null | undefined;
  readonly tricks: number | null | undefined;
  readonly holders: AbilityHolders;
}

export interface EntryChangesInput {
  readonly bid?: number | null | undefined;
  readonly bidAdjustment?: BidAdjustment | null | undefined;
  readonly rascalBet?: RascalBet | null | undefined;
  readonly tricks?: number | null | undefined;
  readonly bonuses?: Partial<BonusCounts> | null | undefined;
}

export interface EntryChanges extends Partial<BonusCounts> {
  readonly bid?: number | null;
  readonly bidAdjustment?: BidAdjustment;
  readonly rascalBet?: RascalBet;
  readonly tricks?: number | null;
}

function isAboveCardCount(count: number | null | undefined, cardCount: number): boolean {
  return typeof count === 'number' && count > cardCount;
}

export interface AbilityFacts {
  readonly roundNumber: number;
  readonly playerId: string;
  readonly bidAdjustment: number | null;
  readonly rascalBet: number | null;
}

export interface AbilityHolders {
  readonly adjusted: readonly string[];
  readonly betting: readonly string[];
}

export function selectAbilityHolders(
  entries: readonly AbilityFacts[],
  roundNumber: number,
): AbilityHolders {
  const ofRound = entries.filter((entry) => entry.roundNumber === roundNumber);
  return {
    adjusted: ofRound
      .filter((entry) => (entry.bidAdjustment ?? 0) !== 0)
      .map((entry) => entry.playerId),
    betting: ofRound.filter((entry) => (entry.rascalBet ?? 0) !== 0).map((entry) => entry.playerId),
  };
}

export function refuseRoundWrite(roundNumber: number, currentRound: number): GameErrorCode | null {
  return roundNumber > currentRound ? 'round-not-played' : null;
}

function isUsedByAnother(
  value: number | null | undefined,
  holders: readonly string[],
  playerId: string,
): boolean {
  if (value === undefined || value === null || value === 0) return false;
  return holders.some((holder) => holder !== playerId);
}

function isSecondAbility(facts: EntryWriteFacts): boolean {
  return (
    isUsedByAnother(facts.bidAdjustment, facts.holders.adjusted, facts.playerId) ||
    isUsedByAnother(facts.rascalBet, facts.holders.betting, facts.playerId)
  );
}

// @FollowsBlueprint core-decision-table-for-a-lifecycle
export function refuseEntryWrite(facts: EntryWriteFacts): GameErrorCode | null {
  const roundRefusal = refuseRoundWrite(facts.roundNumber, facts.currentRound);
  if (roundRefusal !== null) return roundRefusal;
  if (!facts.seatedPlayerIds.includes(facts.playerId)) return 'player-not-found';
  const cardCount = selectCardCount(facts.roundNumber, facts.seatedPlayerIds.length);
  if (isAboveCardCount(facts.bid, cardCount) || isAboveCardCount(facts.tricks, cardCount)) {
    return 'value-out-of-range';
  }
  if (isSecondAbility(facts)) return 'value-out-of-range';
  return null;
}

function selectBonusChanges(
  bonuses: Partial<BonusCounts> | null | undefined,
): Partial<BonusCounts> {
  if (bonuses === undefined) return {};
  return bonuses ?? NO_BONUS;
}

export function selectEntryChanges(input: EntryChangesInput): EntryChanges {
  return {
    ...(input.bid === undefined ? {} : { bid: input.bid }),
    ...(input.bidAdjustment === undefined ? {} : { bidAdjustment: input.bidAdjustment ?? 0 }),
    ...(input.rascalBet === undefined ? {} : { rascalBet: input.rascalBet ?? 0 }),
    ...(input.tricks === undefined ? {} : { tricks: input.tricks }),
    ...selectBonusChanges(input.bonuses),
  };
}

export interface ClaimableSeat {
  readonly id: string;
  readonly accountId: string | null;
}

export type SeatHolding = 'mine' | 'free' | 'seat-taken' | 'player-not-found';

export function selectSeatHolding(
  seats: readonly ClaimableSeat[],
  playerId: string,
  accountId: string,
): SeatHolding {
  const seat = seats.find((candidate) => candidate.id === playerId);
  if (seat === undefined) return 'player-not-found';
  if (seat.accountId === null) return 'free';
  return seat.accountId === accountId ? 'mine' : 'seat-taken';
}

export interface PhasePosition {
  readonly round: number;
  readonly phase: RoundPhase;
}

export interface PlayedRound extends RoundDiscards {
  readonly number: number;
  readonly cardCount: number;
  readonly entries: readonly ScoredEntry[];
}

export interface PhaseMoveFacts {
  readonly current: PhasePosition;
  readonly target: PhasePosition;
  readonly rounds: readonly PlayedRound[];
}

function isSamePosition(first: PhasePosition, second: PhasePosition): boolean {
  return first.round === second.round && first.phase === second.phase;
}

function isMovingForward(facts: PhaseMoveFacts): boolean {
  return facts.target.round > facts.current.round || facts.target.phase === 'finished';
}

function areBidsPlaced(rounds: readonly PlayedRound[], roundNumber: number): boolean {
  const round = rounds.find((candidate) => candidate.number === roundNumber);
  return round !== undefined && isEveryBidPlaced(round.entries);
}

function isBalanced(round: PlayedRound): boolean {
  return canCloseRound(tallyTricks(round.entries, round.cardCount, round));
}

export function refusePhaseMove(facts: PhaseMoveFacts): GameErrorCode | null {
  if (isSamePosition(facts.current, facts.target)) return null;
  if (facts.target.phase === 'scoring' && !areBidsPlaced(facts.rounds, facts.target.round)) {
    return 'bids-missing';
  }
  if (isMovingForward(facts) && !facts.rounds.every(isBalanced)) return 'tricks-unbalanced';
  return null;
}
