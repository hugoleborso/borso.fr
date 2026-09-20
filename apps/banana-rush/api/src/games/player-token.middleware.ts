import type { Context } from 'hono';
import { GameError } from '../helpers/errors/game-error.types';
import { readBearerToken } from '../helpers/http/bearer-token.core';

export const PLAYER_TOKEN_HEADER = 'authorization';
export const PLAYER_TOKEN_SCHEME = 'Bearer';

// @FollowsBlueprint environment-reader
export function readPlayerToken(context: Context): string | null {
  return readBearerToken(context.req.header(PLAYER_TOKEN_HEADER));
}

export function requirePlayerToken(context: Context): string {
  const token = readPlayerToken(context);
  if (token === null) throw new GameError('not-a-player');
  return token;
}
