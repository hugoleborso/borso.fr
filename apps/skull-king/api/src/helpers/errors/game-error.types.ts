import type { GameErrorCode } from '@domain/game-error.core';

export type GameErrorStatus = 400 | 401 | 404 | 409;

const STATUS_BY_CODE: Readonly<Record<GameErrorCode, GameErrorStatus>> = {
  'game-not-found': 404,
  'player-not-found': 404,
  'round-not-played': 409,
  'value-out-of-range': 400,
  'bids-missing': 409,
  'tricks-unbalanced': 409,
  'seat-taken': 409,
  'session-required': 401,
  'passkey-not-verified': 400,
};

// @FollowsBlueprint named-domain-error
export class GameError extends Error {
  public readonly code: GameErrorCode;
  public readonly status: GameErrorStatus;

  constructor(code: GameErrorCode) {
    super(code);
    this.name = 'GameError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}

export function isGameError(candidate: unknown): candidate is GameError {
  return candidate instanceof GameError;
}
