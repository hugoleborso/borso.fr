import { NO_TIME_LEFT } from './countdown.core';
import type { BroadcastGame } from './game-broadcast.core';

type GameStatus = BroadcastGame['status'];

// @FollowsBlueprint core-view-intent
export function isRoundOver(secondsRemaining: number | null, status: GameStatus | null): boolean {
  if (status !== 'playing') return false;
  return secondsRemaining === NO_TIME_LEFT;
}

export function isJoinable(areYouSeated: boolean, status: GameStatus): boolean {
  if (areYouSeated) return false;
  return status === 'lobby';
}

export function isLastRoundShowing(hasLastRound: boolean, hasViewerBid: boolean): boolean {
  if (!hasLastRound) return false;
  return !hasViewerBid;
}
