export const GAME_ERROR_CODES = [
  'game-not-found',
  'game-full',
  'already-started',
  'avatar-taken',
  'not-in-lobby',
  'not-enough-players',
  'not-host',
  'not-a-player',
  'not-playing',
  'already-bid',
  'round-still-open',
  'not-finished',
  'no-rematch',
] as const;

export type GameErrorCode = (typeof GAME_ERROR_CODES)[number];

export type GameErrorStatus = 401 | 403 | 404 | 409;

const STATUS_BY_CODE: Readonly<Record<GameErrorCode, GameErrorStatus>> = {
  'game-not-found': 404,
  'game-full': 409,
  'already-started': 409,
  'avatar-taken': 409,
  'not-in-lobby': 409,
  'not-enough-players': 409,
  'not-host': 403,
  'not-a-player': 401,
  'not-playing': 409,
  'already-bid': 409,
  'round-still-open': 409,
  'not-finished': 409,
  'no-rematch': 409,
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
