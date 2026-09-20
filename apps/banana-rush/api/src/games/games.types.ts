import type { PlayerOutcome } from './round.core';
import type { GameStatus } from './games.schema';

export interface PlayerView {
  readonly id: string;
  readonly nickname: string;
  readonly avatar: string;
  readonly stashBananas: number;
  readonly isHost: boolean;
  readonly hasBid: boolean;
}

export interface RoundResultView {
  readonly roundNumber: number;
  readonly crateBefore: number;
  readonly crateAfter: number;
  readonly outcomes: readonly PlayerOutcome[];
}

export interface GameView {
  readonly joinCode: string;
  readonly status: GameStatus;
  readonly maxPlayers: number;
  readonly freeSeats: number;
  readonly winningScore: number;
  readonly roundTimerSeconds: number | null;
  readonly crateBananas: number;
  readonly currentRound: number;
  readonly roundOpenedAt: string | null;
  readonly players: readonly PlayerView[];
  readonly lastRound: RoundResultView | null;
  readonly rematchJoinCode: string | null;
  readonly winnerIds: readonly string[];
  readonly viewerId: string | null;
  readonly viewerBid: number | null;
}

export interface SeatedPlayer {
  readonly game: GameView;
  readonly playerId: string;
  readonly playerToken: string;
}
