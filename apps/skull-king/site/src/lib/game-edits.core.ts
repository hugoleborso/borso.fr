import type { PirateAvatar } from '@domain/pirate-avatar.core';
import type { PlayerColor, PlayerIcon } from '@domain/player-mark.core';
import { type RoundPhase, selectCardCount } from '@domain/round.core';
import {
  DEFAULT_BID,
  type BidAdjustment,
  type BonusCounts,
  NO_BONUS,
  RASCAL_BETS,
  type RascalBet,
} from '@domain/scoring.core';
import { selectStep, type StepDirection } from './ability-stepper.core';
import type { GameEntry, GameRound, GameView } from './game-view.core';

export interface EntryEdit {
  readonly bid?: number | null;
  readonly bidAdjustment?: BidAdjustment;
  readonly rascalBet?: RascalBet;
  readonly isMissed?: boolean;
  readonly tricks?: number | null;
  readonly bonuses?: BonusCounts;
}

export interface PlayerEdit {
  readonly name?: string;
  readonly icon?: PlayerIcon;
  readonly color?: PlayerColor;
  readonly avatar?: PirateAvatar;
}

function editEntry(entry: GameEntry, edit: EntryEdit): GameEntry {
  return {
    playerId: entry.playerId,
    bid: edit.bid === undefined ? entry.bid : edit.bid,
    bidAdjustment: edit.bidAdjustment ?? entry.bidAdjustment,
    rascalBet: edit.rascalBet ?? entry.rascalBet,
    isMissed: edit.isMissed ?? entry.isMissed,
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
 * @BlueprintDescription Applies the request to a view the way the server applies it to its rows, so the tapped value shows at once. Every edit sets values and never adds to them, so laying it again over a server view that already holds it changes nothing, which is what lets the cache lay every pending edit over the newest server view each time one arrives rather than keep a prediction the server has since moved past.
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
      bid: DEFAULT_BID,
      bidAdjustment: 0,
      rascalBet: 0,
      isMissed: false,
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

export type GameEdit =
  | {
      readonly kind: 'entry';
      readonly roundNumber: number;
      readonly playerId: string;
      readonly edit: EntryEdit;
    }
  | { readonly kind: 'round'; readonly roundNumber: number; readonly edit: RoundEdit }
  | { readonly kind: 'phase'; readonly round: number; readonly phase: RoundPhase }
  | { readonly kind: 'player'; readonly playerId: string; readonly edit: PlayerEdit }
  | { readonly kind: 'seat'; readonly playerId: string; readonly accountId: string };

export function applyGameEdit(game: GameView, change: GameEdit): GameView {
  switch (change.kind) {
    case 'entry':
      return applyEntryEdit(game, change.roundNumber, change.playerId, change.edit);
    case 'round':
      return applyRoundEdit(game, change.roundNumber, change.edit);
    case 'phase':
      return applyPhaseEdit(game, change.round, change.phase);
    case 'player':
      return applyPlayerEdit(game, change.playerId, change.edit);
    case 'seat':
      return applySeatClaim(game, change.playerId, change.accountId);
  }
}

export function selectNextBidAdjustment(
  current: BidAdjustment,
  picked: BidAdjustment,
): BidAdjustment {
  return picked === current ? 0 : picked;
}

export function stepRascalBet(bet: RascalBet, direction: StepDirection): RascalBet {
  return selectStep(RASCAL_BETS, bet, direction) ?? bet;
}
