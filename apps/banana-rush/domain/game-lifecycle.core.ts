import { MINIMUM_SEATS } from './game-setup.core';

export const GAME_STATUSES = ['lobby', 'playing', 'finished'] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];

export type StartRefusal = 'not-in-lobby' | 'not-enough-players';

// @FollowsBlueprint domain-shared-selection
export function refuseStart(status: GameStatus, playerCount: number): StartRefusal | null {
  if (status !== 'lobby') return 'not-in-lobby';
  if (playerCount < MINIMUM_SEATS) return 'not-enough-players';
  return null;
}
