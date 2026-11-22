import { selectCardCount, type RoundPhase } from '@domain/round.core';
import {
  BID_ADJUSTMENTS,
  type BidAdjustment,
  type BonusCounts,
  NO_BONUS,
  RASCAL_BETS,
  type RascalBet,
} from '@domain/scoring.core';
import type { EntryView, GameView, PlayerView, RoundView } from './games.types';

const FIRST_ROUND = 1;
const UNWRITTEN_REVISION = 0;

export interface GameFacts {
  readonly joinCode: string;
  readonly phase: RoundPhase;
  readonly currentRound: number;
  readonly rematchJoinCode: string | null;
  readonly revision: number | null;
}

export interface RoundFacts {
  readonly roundNumber: number;
  readonly isKrakenPlayed: boolean;
  readonly isWhiteWhaleDiscard: boolean | null;
}

export interface EntryFacts extends BonusCounts {
  readonly roundNumber: number;
  readonly playerId: string;
  readonly bid: number | null;
  readonly bidAdjustment: number | null;
  readonly rascalBet: number | null;
  readonly tricks: number | null;
}

export interface BuildGameViewInput {
  readonly game: GameFacts;
  readonly players: readonly PlayerView[];
  readonly rounds: readonly RoundFacts[];
  readonly entries: readonly EntryFacts[];
  readonly readAt: Date;
}

function entryKey(roundNumber: number, playerId: string): string {
  return `${roundNumber}:${playerId}`;
}

export function readBonuses(entry: EntryFacts): BonusCounts {
  return {
    standardFourteen: entry.standardFourteen,
    blackFourteen: entry.blackFourteen,
    mermaidByPirate: entry.mermaidByPirate,
    pirateBySkullKing: entry.pirateBySkullKing,
    skullKingByMermaid: entry.skullKingByMermaid,
    loot: entry.loot,
  };
}

const NO_ADJUSTMENT: BidAdjustment = 0;

export function readBidAdjustment(stored: number | null): BidAdjustment {
  return BID_ADJUSTMENTS.find((adjustment) => adjustment === stored) ?? NO_ADJUSTMENT;
}

const NO_BET: RascalBet = 0;

export function readRascalBet(stored: number | null): RascalBet {
  return RASCAL_BETS.find((bet) => bet === stored) ?? NO_BET;
}

function describeEntry(playerId: string, entry: EntryFacts | undefined): EntryView {
  if (entry === undefined) {
    return {
      playerId,
      bid: null,
      bidAdjustment: NO_ADJUSTMENT,
      rascalBet: NO_BET,
      tricks: null,
      bonuses: NO_BONUS,
    };
  }
  return {
    playerId,
    bid: entry.bid,
    bidAdjustment: readBidAdjustment(entry.bidAdjustment),
    rascalBet: readRascalBet(entry.rascalBet),
    tricks: entry.tricks,
    bonuses: readBonuses(entry),
  };
}

function listRoundNumbers(currentRound: number): readonly number[] {
  return Array.from({ length: currentRound }, (_, index) => FIRST_ROUND + index);
}

// @FollowsBlueprint core-projection
export function buildGameView(input: BuildGameViewInput): GameView {
  const players = input.players.toSorted((first, second) => first.seat - second.seat);
  const roundByNumber = new Map(input.rounds.map((round) => [round.roundNumber, round]));
  const entryByKey = new Map(
    input.entries.map((entry) => [entryKey(entry.roundNumber, entry.playerId), entry]),
  );
  const rounds: readonly RoundView[] = listRoundNumbers(input.game.currentRound).map(
    (roundNumber) => ({
      number: roundNumber,
      cardCount: selectCardCount(roundNumber, players.length),
      isKrakenPlayed: roundByNumber.get(roundNumber)?.isKrakenPlayed ?? false,
      isWhiteWhaleDiscard: roundByNumber.get(roundNumber)?.isWhiteWhaleDiscard ?? false,
      entries: players.map((player) =>
        describeEntry(player.id, entryByKey.get(entryKey(roundNumber, player.id))),
      ),
    }),
  );
  return {
    joinCode: input.game.joinCode,
    phase: input.game.phase,
    currentRound: input.game.currentRound,
    rematchJoinCode: input.game.rematchJoinCode,
    revision: input.game.revision ?? UNWRITTEN_REVISION,
    players: players.map((player) => ({
      id: player.id,
      seat: player.seat,
      name: player.name,
      icon: player.icon,
      color: player.color,
      accountId: player.accountId,
    })),
    rounds,
    readAt: input.readAt.toISOString(),
  };
}
