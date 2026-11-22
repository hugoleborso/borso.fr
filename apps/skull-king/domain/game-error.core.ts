export const GAME_ERROR_CODES = [
  'game-not-found',
  'player-not-found',
  'round-not-played',
  'value-out-of-range',
  'bids-missing',
  'tricks-unbalanced',
  'seat-taken',
  'session-required',
  'passkey-not-verified',
] as const;

export type GameErrorCode = (typeof GAME_ERROR_CODES)[number];
