import type { GameErrorCode } from '@domain/game-error.core';
import {
  canCloseRound,
  isBidAdjustedOnce,
  isEveryBidPlaced,
  isRascalBetOnce,
  ROUND_COUNT,
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

export interface RoundEntryFacts extends ScoredEntry {
  readonly playerId: string;
}

export interface EntryWriteFacts {
  readonly roundNumber: number;
  readonly currentRound: number;
  readonly seatedPlayerIds: readonly string[];
  readonly playerId: string;
  readonly changes: EntryChanges;
  readonly roundEntries: readonly RoundEntryFacts[];
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
  return (count ?? 0) > cardCount;
}

export function refuseRoundWrite(roundNumber: number, currentRound: number): GameErrorCode | null {
  return roundNumber > currentRound ? 'round-not-played' : null;
}

function withAbilities(entry: RoundEntryFacts, changes: EntryChanges): RoundEntryFacts {
  return {
    ...entry,
    bidAdjustment: changes.bidAdjustment ?? entry.bidAdjustment,
    rascalBet: changes.rascalBet ?? entry.rascalBet,
  };
}

function isSecondAbility(facts: EntryWriteFacts): boolean {
  const after = facts.roundEntries.map((entry) =>
    entry.playerId === facts.playerId ? withAbilities(entry, facts.changes) : entry,
  );
  return !isBidAdjustedOnce(after) || !isRascalBetOnce(after);
}

// @FollowsBlueprint core-decision-table-for-a-lifecycle
export function refuseEntryWrite(facts: EntryWriteFacts): GameErrorCode | null {
  const roundRefusal = refuseRoundWrite(facts.roundNumber, facts.currentRound);
  if (roundRefusal !== null) return roundRefusal;
  if (!facts.seatedPlayerIds.includes(facts.playerId)) return 'player-not-found';
  const cardCount = selectCardCount(facts.roundNumber, facts.seatedPlayerIds.length);
  if (
    isAboveCardCount(facts.changes.bid, cardCount) ||
    isAboveCardCount(facts.changes.tricks, cardCount)
  ) {
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

export interface SeatClaim {
  readonly refusal: GameErrorCode | null;
  readonly isLinking: boolean;
}

export function decideSeatClaim(
  seats: readonly ClaimableSeat[],
  playerId: string,
  accountId: string,
): SeatClaim {
  const seat = seats.find((candidate) => candidate.id === playerId);
  if (seat === undefined) return { refusal: 'player-not-found', isLinking: false };
  if (seat.accountId === null) return { refusal: null, isLinking: true };
  return { refusal: seat.accountId === accountId ? null : 'seat-taken', isLinking: false };
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

function isWithinRound(current: PhasePosition, target: PhasePosition): boolean {
  return target.round === current.round && target.phase !== 'finished';
}

function isNextRound(current: PhasePosition, target: PhasePosition): boolean {
  return target.round === current.round + 1 && target.phase === 'bidding';
}

function isClosingLastRound(current: PhasePosition, target: PhasePosition): boolean {
  return (
    current.round === ROUND_COUNT && current.phase === 'scoring' && target.round === ROUND_COUNT
  );
}

function areBidsPlaced(rounds: readonly PlayedRound[], roundNumber: number): boolean {
  return rounds.every((round) => round.number !== roundNumber || isEveryBidPlaced(round.entries));
}

function isBalanced(round: PlayedRound): boolean {
  return canCloseRound(tallyTricks(round.entries, round.cardCount, round));
}

export function refusePhaseMove(facts: PhaseMoveFacts): GameErrorCode | null {
  const { current, target } = facts;
  if (isSamePosition(current, target)) return null;
  const isWithin = isWithinRound(current, target);
  if (!isWithin && !isNextRound(current, target) && !isClosingLastRound(current, target)) {
    return 'value-out-of-range';
  }
  if (target.phase === 'scoring' && !areBidsPlaced(facts.rounds, target.round)) {
    return 'bids-missing';
  }
  if (!isWithin && !facts.rounds.every(isBalanced)) return 'tricks-unbalanced';
  return null;
}
