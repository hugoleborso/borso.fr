import { countFreeSeats } from './game.core';
import type { GameStatus } from './games.schema';
import type { GameView, PlayerView, RoundResultView } from './games.types';

export interface GameFacts {
  readonly joinCode: string;
  readonly status: GameStatus;
  readonly maxPlayers: number;
  readonly winningScore: number;
  readonly roundTimerSeconds: number | null;
  readonly crateBananas: number;
  readonly currentRound: number;
  readonly roundOpenedAt: Date | null;
  readonly rematchJoinCode: string | null;
}

export interface PlayerFacts {
  readonly id: string;
  readonly nickname: string;
  readonly avatar: string;
  readonly stashBananas: number;
  readonly isHost: boolean;
}

export interface BidFacts {
  readonly playerId: string;
  readonly amount: number;
}

export interface BuildGameViewInput {
  readonly game: GameFacts;
  readonly players: readonly PlayerFacts[];
  readonly bidsThisRound: readonly BidFacts[];
  readonly lastRound: RoundResultView | null;
  readonly winnerIds: readonly string[];
  readonly viewerId: string | null;
}

/**
 * @Blueprint core-view-hiding-what-only-one-reader-may-see
 * @BlueprintName Core View Hiding What Only One Reader May See
 * @BlueprintUsage Use where one record has to be described to several readers at once and part of it is private to one of them.
 * @BlueprintDescription Builds the whole description in one pure function that takes the viewer as an argument, so the shared part and the private part can never drift apart into two builders that disagree. A secret bid leaves the function as the plain fact that somebody has answered, and the number itself is attached only when the viewer is the player who wrote it. Passing `null` for the viewer yields the description every reader may see, which is exactly what the broadcast sends, so the private overlay is impossible to leak by forgetting to strip it.
 */
export function buildGameView(input: BuildGameViewInput): GameView {
  const bidByPlayerId = new Map(input.bidsThisRound.map((bid) => [bid.playerId, bid.amount]));
  const players: readonly PlayerView[] = input.players.map((player) => ({
    id: player.id,
    nickname: player.nickname,
    avatar: player.avatar,
    stashBananas: player.stashBananas,
    isHost: player.isHost,
    hasBid: bidByPlayerId.has(player.id),
  }));

  const viewer = input.players.find((player) => player.id === input.viewerId);

  return {
    joinCode: input.game.joinCode,
    status: input.game.status,
    maxPlayers: input.game.maxPlayers,
    freeSeats: countFreeSeats(input.players.length, input.game.maxPlayers),
    winningScore: input.game.winningScore,
    roundTimerSeconds: input.game.roundTimerSeconds,
    crateBananas: input.game.crateBananas,
    currentRound: input.game.currentRound,
    roundOpenedAt: input.game.roundOpenedAt?.toISOString() ?? null,
    players,
    lastRound: input.lastRound,
    rematchJoinCode: input.game.rematchJoinCode,
    winnerIds: input.winnerIds,
    viewerId: input.viewerId,
    viewerBid: viewer === undefined ? null : (bidByPlayerId.get(viewer.id) ?? null),
  };
}
