import type { PlayerColor, PlayerIcon } from '@domain/player-mark.core';
import { type RoundPhase, selectCardCount } from '@domain/round.core';
import {
  type BidAdjustment,
  type BonusCounts,
  type BonusKind,
  MAXIMUM_BONUS_COUNT,
  NO_BONUS,
  RASCAL_BETS,
  type RascalBet,
} from '@domain/scoring.core';
import type { GameEntry, GameRound, GameView } from './game-view.core';

export interface EntryEdit {
  readonly bid?: number | null;
  readonly bidAdjustment?: BidAdjustment;
  readonly rascalBet?: RascalBet;
  readonly tricks?: number | null;
  readonly bonuses?: BonusCounts;
}

export interface PlayerEdit {
  readonly name?: string;
  readonly icon?: PlayerIcon;
  readonly color?: PlayerColor;
}

function editEntry(entry: GameEntry, edit: EntryEdit): GameEntry {
  return {
    playerId: entry.playerId,
    bid: edit.bid === undefined ? entry.bid : edit.bid,
    bidAdjustment: edit.bidAdjustment ?? entry.bidAdjustment,
    rascalBet: edit.rascalBet ?? entry.rascalBet,
    tricks: edit.tricks === undefined ? entry.tricks : edit.tricks,
    bonuses: edit.bonuses ?? entry.bonuses,
  };
}

function editRound(
  game: GameView,
  roundNumber: number,
  change: (round: GameRound) => GameRound,
): GameView {
  return {
    ...game,
    rounds: game.rounds.map((round) => (round.number === roundNumber ? change(round) : round)),
  };
}

/**
 * @Blueprint core-predicting-the-view-a-write-will-answer
 * @BlueprintName Core Predicting The View A Write Will Answer
 * @BlueprintUsage Use for the optimistic half of a write whose answer is the whole record, when the request alone decides every field the screen shows.
 * @BlueprintDescription Applies the request to the cached view the way the server applies it to its rows, so the tapped value shows at once and the answer that follows replaces the prediction rather than correcting it. The prediction keeps the cached `readAt`, which is what lets the server's answer and any broadcast newer than it win the comparison that guards the cache, and an older broadcast still lose it.
 */
export function applyEntryEdit(
  game: GameView,
  roundNumber: number,
  playerId: string,
  edit: EntryEdit,
): GameView {
  return editRound(game, roundNumber, (round) => ({
    ...round,
    entries: round.entries.map((entry) =>
      entry.playerId === playerId ? editEntry(entry, edit) : entry,
    ),
  }));
}

export interface RoundEdit {
  readonly isKrakenPlayed?: boolean;
  readonly isWhiteWhaleDiscard?: boolean;
}

export function applyRoundEdit(game: GameView, roundNumber: number, edit: RoundEdit): GameView {
  return editRound(game, roundNumber, (round) => ({
    ...round,
    isKrakenPlayed: edit.isKrakenPlayed ?? round.isKrakenPlayed,
    isWhiteWhaleDiscard: edit.isWhiteWhaleDiscard ?? round.isWhiteWhaleDiscard,
  }));
}

function openRound(game: GameView, roundNumber: number): GameRound {
  return {
    number: roundNumber,
    cardCount: selectCardCount(roundNumber, game.players.length),
    isKrakenPlayed: false,
    isWhiteWhaleDiscard: false,
    entries: game.players.map((player) => ({
      playerId: player.id,
      bid: null,
      bidAdjustment: 0,
      rascalBet: 0,
      tricks: null,
      bonuses: NO_BONUS,
    })),
  };
}

export function applyPhaseEdit(game: GameView, roundNumber: number, phase: RoundPhase): GameView {
  const kept = game.rounds.filter((round) => round.number <= roundNumber);
  const isOpen = kept.some((round) => round.number === roundNumber);
  return {
    ...game,
    currentRound: roundNumber,
    phase,
    rounds: isOpen ? kept : [...kept, openRound(game, roundNumber)],
  };
}

export function applyPlayerEdit(game: GameView, playerId: string, edit: PlayerEdit): GameView {
  return {
    ...game,
    players: game.players.map((player) =>
      player.id === playerId ? { ...player, ...edit } : player,
    ),
  };
}

export function applySeatClaim(game: GameView, playerId: string, accountId: string): GameView {
  return {
    ...game,
    players: game.players.map((player) =>
      player.id === playerId ? { ...player, accountId } : player,
    ),
  };
}

export function cycleBonus(bonuses: BonusCounts, kind: BonusKind): BonusCounts {
  const next = bonuses[kind] >= MAXIMUM_BONUS_COUNT[kind] ? 0 : bonuses[kind] + 1;
  return { ...bonuses, [kind]: next };
}

export function selectNextBidAdjustment(
  current: BidAdjustment,
  picked: BidAdjustment,
): BidAdjustment {
  return picked === current ? 0 : picked;
}

export function cycleRascalBet(bet: RascalBet): RascalBet {
  const next = RASCAL_BETS[RASCAL_BETS.indexOf(bet) + 1];
  return next ?? 0;
}
