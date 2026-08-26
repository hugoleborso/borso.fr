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
import { readBallotToken } from './ballot-token.utils';
import {
  BALLOT_TOKEN_HEADER,
  type BallotEnvironment,
  requireBallot,
  translateAudienceRefusals,
} from './open-ballot.middleware';

/**
 * @Blueprint controller-public-and-gated-routers
 * @BlueprintName Controller With A Public Router And A Gated One
 * @BlueprintUsage Use for a slice whose routes share one mount prefix and only some of which carry a session gate.
 * @BlueprintDescription Returns two routers rather than one, and the gated router applies `requireSharedPasswordSession` on each route rather than through `.use('*')`. A sub-router carrying `.use('*')` registers `/<prefix>/*` in the parent, so mounting it before a public sub-router at the same prefix makes the public routes answer 401; applying the guard per route removes that mount-order hazard entirely. The sibling test drives every public route through the composition root with no cookie, so a guard forgotten on either side fails loudly rather than at a concert.
 */
export function buildAudienceRouter() {
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
      translateAudienceRefusals,
      zValidator('query', audienceSearchQuerySchema),
      async (context) => {
        const { q } = context.req.valid('query');
        const hits = await searchForSuggestion({ query: q, now: new Date() });
        return context.json({ hits });
      },
    )
    .post(
      '/rounds/:roundId/votes',
      translateAudienceRefusals,
      requireBallot,
      zValidator('param', roundParamSchema),
      zValidator('json', voteCreateSchema),
      async (context) => {
        const { roundId } = context.req.valid('param');
        const { songId } = context.req.valid('json');
        await castVote({
          roundId,
          ballotToken: context.get('ballotToken'),
          songId,
          now: new Date(),
        });
        return context.json({ roundId, songId, cast: true }, 201);
      },
    )
    .delete(
      '/rounds/:roundId/votes/:songId',
      translateAudienceRefusals,
      requireBallot,
      zValidator('param', roundVoteParamSchema),
      async (context) => {
        const { roundId, songId } = context.req.valid('param');
        await retractVote({
          roundId,
          ballotToken: context.get('ballotToken'),
          songId,
          now: new Date(),
        });
        return context.json({ roundId, songId, retracted: true });
      },
    )
    .post(
      '/concerts/:sessionId/suggestions',
      translateAudienceRefusals,
      requireBallot,
      zValidator('param', concertParamSchema),
      zValidator('json', suggestionCreateSchema),
      async (context) => {
        const { sessionId } = context.req.valid('param');
        const { mbid } = context.req.valid('json');
        const song = await acceptSuggestion({
          sessionId,
          ballotToken: context.get('ballotToken'),
          musicBrainzId: mbid,
          now: new Date(),
        });
        return context.json({ song }, 201);
      },
    );

  const gatedRouter = new Hono()
    .post(
      '/concerts/:sessionId/rounds',
      requireSharedPasswordSession,
      translateAudienceRefusals,
      zValidator('param', concertParamSchema),
      async (context) => {
        const { sessionId } = context.req.valid('param');
        const round = await openRound({ sessionId, now: new Date() });
        return context.json({ round }, 201);
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
