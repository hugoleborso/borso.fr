import type { PlayerColor, PlayerIcon } from '@domain/player-mark.core';
import type { RoundPhase } from '@domain/round.core';
import type { BidAdjustment, BonusCounts, RascalBet } from '@domain/scoring.core';

export interface PlayerView {
  readonly id: string;
  readonly seat: number;
  readonly name: string;
  readonly icon: PlayerIcon;
  readonly color: PlayerColor;
  readonly accountId: string | null;
}

export interface EntryView {
  readonly playerId: string;
  readonly bid: number | null;
  readonly bidAdjustment: BidAdjustment;
  readonly rascalBet: RascalBet;
  readonly isMissed: boolean;
  readonly tricks: number | null;
  readonly bonuses: BonusCounts;
}

export interface RoundView {
  readonly number: number;
  readonly cardCount: number;
  readonly isKrakenPlayed: boolean;
  readonly isWhiteWhaleDiscard: boolean;
  readonly entries: readonly EntryView[];
}

export interface GameView {
  readonly joinCode: string;
  readonly phase: RoundPhase;
  readonly currentRound: number;
  readonly rematchJoinCode: string | null;
  readonly revision: number;
  readonly players: readonly PlayerView[];
  readonly rounds: readonly RoundView[];
  readonly readAt: string;
}
