import { BALLOT_TOKEN_HEADER } from '@domain/ballot-token.core';
import type { Context, MiddlewareHandler } from 'hono';
import { readBallotToken } from './ballot-token.utils';

export interface BallotEnvironment {
  Variables: { ballotToken: string };
}

export function readOptionalBallotToken(context: Context): string | null {
  return readBallotToken(context.req.header(BALLOT_TOKEN_HEADER));
}

// @FollowsBlueprint middleware-session-gate
export const requireBallot: MiddlewareHandler<BallotEnvironment> = async (context, next) => {
  const ballotToken = readOptionalBallotToken(context);
  if (ballotToken === null) {
    return context.json({ error: 'ballot-required' }, 401);
  }
  context.set('ballotToken', ballotToken);
  await next();
  return;
};
