import type { MiddlewareHandler } from 'hono';
import { readBallotToken } from './ballot-token.utils';

export const BALLOT_TOKEN_HEADER = 'x-ballot-token';

export interface BallotEnvironment {
  Variables: { ballotToken: string };
}

// @FollowsBlueprint middleware-session-gate
export const requireBallot: MiddlewareHandler<BallotEnvironment> = async (context, next) => {
  const ballotToken = readBallotToken(context.req.header(BALLOT_TOKEN_HEADER));
  if (ballotToken === null) {
    return context.json({ error: 'ballot-required' }, 401);
  }
  context.set('ballotToken', ballotToken);
  await next();
  return;
};
