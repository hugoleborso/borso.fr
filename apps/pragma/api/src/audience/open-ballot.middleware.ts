import type { MiddlewareHandler } from 'hono';
import { type AudienceRefusal, AudienceRefusedError } from './audience.types';
import { readBallotToken } from './ballot-token.utils';

export const BALLOT_TOKEN_HEADER = 'x-ballot-token';

export interface BallotEnvironment {
  Variables: { ballotToken: string };
}

const STATUS_BY_REFUSAL = {
  'not-a-concert': 422,
  'round-already-open': 409,
  'round-closed': 409,
  'song-not-in-pool': 422,
  'song-already-planned': 409,
  'unknown-suggestion': 422,
  'external-search-unavailable': 503,
} as const satisfies Record<AudienceRefusal, number>;

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

/**
 * @Blueprint middleware-refusal-translator
 * @BlueprintName Middleware Translating A Slice's Refusals
 * @BlueprintUsage Use for a slice whose service refuses in several named ways and whose controller would otherwise repeat the same try and catch on every route.
 * @BlueprintDescription Wraps `next()` in one place, so every handler under it stays a dispatcher and the mapping from a refusal to a status code exists once, as a frozen table the compiler checks against the refusal union. Anything that is not this slice's refusal is rethrown untouched, because a middleware that swallowed an unexpected error would turn a defect into a status code nobody investigates.
 */
export const translateAudienceRefusals: MiddlewareHandler = async (context, next) => {
  try {
    await next();
  } catch (error) {
    if (!(error instanceof AudienceRefusedError)) throw error;
    return context.json({ error: error.reason }, STATUS_BY_REFUSAL[error.reason]);
  }
  return;
};
