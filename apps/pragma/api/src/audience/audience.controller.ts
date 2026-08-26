import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { requireSharedPasswordSession } from '../auth/shared-password.middleware';
import {
  audienceSearchQuerySchema,
  concertParamSchema,
  roundParamSchema,
  roundVoteParamSchema,
  suggestionCreateSchema,
  voteCreateSchema,
} from './audience.schema';
import {
  acceptSuggestion,
  castVote,
  findLiveConcert,
  getRoundHistory,
  mintBallot,
  openRound,
  readConcertState,
  retractVote,
  searchForSuggestion,
} from './audience.service';
import type { AudienceRefusal } from './audience.types';
import { buildAudienceSearchLimiter } from './audience-search-limit.middleware';
import { readBallotToken } from './ballot-token.utils';
import {
  BALLOT_TOKEN_HEADER,
  type BallotEnvironment,
  requireBallot,
} from './open-ballot.middleware';

const STATUS_BY_REFUSAL = {
  'not-a-concert': 422,
  'round-already-open': 409,
  'round-closed': 409,
  'duplicate-vote': 409,
  'song-not-in-pool': 422,
  'song-already-planned': 409,
  'unknown-suggestion': 422,
  'external-search-unavailable': 503,
} as const satisfies Record<AudienceRefusal, number>;

/**
 * @Blueprint controller-public-and-gated-routers
 * @BlueprintName Controller With A Public Router And A Gated One
 * @BlueprintUsage Use for a slice whose routes share one mount prefix and only some of which carry a session gate.
 * @BlueprintDescription Returns two routers rather than one, and the gated router applies `requireSharedPasswordSession` on each route rather than through a wildcard `use`. A sub-router carrying one registers `/<prefix>/*` in the parent, so mounting it before a public sub-router at the same prefix makes the public routes answer 401; applying the guard per route removes that mount-order hazard entirely. Each handler reads the service's outcome union and answers a refusal through one frozen status table, because an exception a Hono handler lets escape becomes a 500 before any middleware of ours can read it. The sibling test drives every public route through the composition root with no cookie, so a guard forgotten on either side fails loudly rather than at a concert.
 */
export function buildAudienceRouter() {
  const limitAudienceSearch = buildAudienceSearchLimiter();
  const publicRouter = new Hono<BallotEnvironment>()
    .get('/live', async (context) => {
      const sessionId = await findLiveConcert(new Date());
      return context.json({ sessionId });
    })
    .post('/concerts/:sessionId/ballot', zValidator('param', concertParamSchema), (context) =>
      context.json({ ballotToken: mintBallot() }, 201),
    )
    .get('/concerts/:sessionId/state', zValidator('param', concertParamSchema), async (context) => {
      const { sessionId } = context.req.valid('param');
      const state = await readConcertState({
        sessionId,
        ballotToken: readBallotToken(context.req.header(BALLOT_TOKEN_HEADER)),
        now: new Date(),
      });
      if (state === null) return context.json({ error: 'not-found' }, 404);
      return context.json({ state });
    })
    .get(
      '/search',
      limitAudienceSearch,
      zValidator('query', audienceSearchQuerySchema),
      async (context) => {
        const { q } = context.req.valid('query');
        const outcome = await searchForSuggestion({ query: q, now: new Date() });
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.reason }, STATUS_BY_REFUSAL[outcome.reason]);
        }
        return context.json({ hits: outcome.hits });
      },
    )
    .post(
      '/rounds/:roundId/votes',
      requireBallot,
      zValidator('param', roundParamSchema),
      zValidator('json', voteCreateSchema),
      async (context) => {
        const { roundId } = context.req.valid('param');
        const { songId } = context.req.valid('json');
        const outcome = await castVote({
          roundId,
          ballotToken: context.get('ballotToken'),
          songId,
          now: new Date(),
        });
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.reason }, STATUS_BY_REFUSAL[outcome.reason]);
        }
        return context.json({ roundId, songId, cast: true }, 201);
      },
    )
    .delete(
      '/rounds/:roundId/votes/:songId',
      requireBallot,
      zValidator('param', roundVoteParamSchema),
      async (context) => {
        const { roundId, songId } = context.req.valid('param');
        const outcome = await retractVote({
          roundId,
          ballotToken: context.get('ballotToken'),
          songId,
          now: new Date(),
        });
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.reason }, STATUS_BY_REFUSAL[outcome.reason]);
        }
        return context.json({ roundId, songId, retracted: true });
      },
    )
    .post(
      '/concerts/:sessionId/suggestions',
      requireBallot,
      zValidator('param', concertParamSchema),
      zValidator('json', suggestionCreateSchema),
      async (context) => {
        const { sessionId } = context.req.valid('param');
        const { mbid } = context.req.valid('json');
        const outcome = await acceptSuggestion({
          sessionId,
          ballotToken: context.get('ballotToken'),
          musicBrainzId: mbid,
          now: new Date(),
        });
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.reason }, STATUS_BY_REFUSAL[outcome.reason]);
        }
        return context.json({ song: outcome.song }, 201);
      },
    );

  const gatedRouter = new Hono()
    .post(
      '/concerts/:sessionId/rounds',
      requireSharedPasswordSession,
      zValidator('param', concertParamSchema),
      async (context) => {
        const { sessionId } = context.req.valid('param');
        const outcome = await openRound({ sessionId, now: new Date() });
        if (outcome.kind === 'refused') {
          return context.json({ error: outcome.reason }, STATUS_BY_REFUSAL[outcome.reason]);
        }
        return context.json({ round: outcome.round }, 201);
      },
    )
    .get(
      '/concerts/:sessionId/rounds',
      requireSharedPasswordSession,
      zValidator('param', concertParamSchema),
      async (context) => {
        const { sessionId } = context.req.valid('param');
        const rounds = await getRoundHistory({ sessionId, now: new Date() });
        return context.json({ rounds });
      },
    );

  return { publicRouter, gatedRouter };
}
