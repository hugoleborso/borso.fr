import type { Context } from 'hono';
import { GameError } from '../helpers/errors/game-error.types';

export const PLAYER_TOKEN_HEADER = 'x-banana-token';

// @FollowsBlueprint environment-reader
export function readPlayerToken(context: Context): string | null {
  const header = context.req.header(PLAYER_TOKEN_HEADER);
  if (header === undefined || header.length === 0) return null;
  return header;
}

export function requirePlayerToken(context: Context): string {
  const token = readPlayerToken(context);
  if (token === null) throw new GameError('not-a-player');
  return token;
}
