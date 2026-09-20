import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  createGameSchema,
  joinCodeParamSchema,
  joinGameSchema,
  placeBidSchema,
} from './games.schema';
import {
  createGame,
  joinGame,
  placeBid,
  readGame,
  readGameRounds,
  resolveExpiredRound,
  startGame,
} from './games.service';
import { claimRematchSeat, startRematch } from './rematch.service';
import { normalizeJoinCode } from './join-code.utils';
import { readPlayerToken, requirePlayerToken } from './player-token.middleware';

const CREATED = 201;

// @FollowsBlueprint controller-dispatch
export function buildGamesRouter() {
  return new Hono()
    .post('/', zValidator('json', createGameSchema), async (context) => {
      const seated = await createGame(context.req.valid('json'), new Date());
      return context.json(seated, CREATED);
    })
    .get('/:code', zValidator('param', joinCodeParamSchema), async (context) => {
      const { code } = context.req.valid('param');
      const game = await readGame(normalizeJoinCode(code), readPlayerToken(context));
      return context.json({ game });
    })
    .post(
      '/:code/players',
      zValidator('param', joinCodeParamSchema),
      zValidator('json', joinGameSchema),
      async (context) => {
        const { code } = context.req.valid('param');
        const seated = await joinGame(
          normalizeJoinCode(code),
          context.req.valid('json'),
          new Date(),
        );
        return context.json(seated, CREATED);
      },
    )
    .post('/:code/start', zValidator('param', joinCodeParamSchema), async (context) => {
      const { code } = context.req.valid('param');
      const game = await startGame(
        normalizeJoinCode(code),
        requirePlayerToken(context),
        new Date(),
      );
      return context.json({ game });
    })
    .post(
      '/:code/bids',
      zValidator('param', joinCodeParamSchema),
      zValidator('json', placeBidSchema),
      async (context) => {
        const { code } = context.req.valid('param');
        const { amount } = context.req.valid('json');
        const game = await placeBid(
          normalizeJoinCode(code),
          requirePlayerToken(context),
          amount,
          new Date(),
        );
        return context.json({ game });
      },
    )
    .get('/:code/rounds', zValidator('param', joinCodeParamSchema), async (context) => {
      const { code } = context.req.valid('param');
      const rounds = await readGameRounds(normalizeJoinCode(code));
      return context.json({ rounds });
    })
    .post('/:code/rematch', zValidator('param', joinCodeParamSchema), async (context) => {
      const { code } = context.req.valid('param');
      const game = await startRematch(
        normalizeJoinCode(code),
        requirePlayerToken(context),
        new Date(),
      );
      return context.json({ game });
    })
    .post('/:code/seat', zValidator('param', joinCodeParamSchema), async (context) => {
      const { code } = context.req.valid('param');
      const seated = await claimRematchSeat(normalizeJoinCode(code), requirePlayerToken(context));
      return context.json(seated, CREATED);
    })
    .post('/:code/resolve', zValidator('param', joinCodeParamSchema), async (context) => {
      const { code } = context.req.valid('param');
      const game = await resolveExpiredRound(
        normalizeJoinCode(code),
        readPlayerToken(context),
        new Date(),
      );
      return context.json({ game });
    });
}
