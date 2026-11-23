import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { readOptionalSession, readVisit } from '../accounts/account-session.middleware';
import {
  createGameSchema,
  entryParamSchema,
  joinCodeParamSchema,
  movePhaseSchema,
  playerParamSchema,
  roundParamSchema,
  updatePlayerSchema,
  writeEntrySchema,
  writeRoundSchema,
} from './games.schema';
import {
  changePlayer,
  claimSeat,
  createGame,
  movePhase,
  readGame,
  refuseInvalidInput,
  startRematch,
  writeEntry,
  writeRound,
} from './games.service';

const CREATED = 201;

// @FollowsBlueprint controller-dispatch
export function buildGamesRouter() {
  return new Hono()
    .use('*', readOptionalSession)
    .post('/', zValidator('json', createGameSchema, refuseInvalidInput), async (context) => {
      const game = await createGame(context.req.valid('json'), readVisit(context));
      return context.json({ game }, CREATED);
    })
    .get(
      '/:code',
      zValidator('param', joinCodeParamSchema, refuseInvalidInput),
      async (context) => {
        const { code } = context.req.valid('param');
        const game = await readGame(code, readVisit(context));
        return context.json({ game });
      },
    )
    .put(
      '/:code/rounds/:round/entries/:playerId',
      zValidator('param', entryParamSchema, refuseInvalidInput),
      zValidator('json', writeEntrySchema, refuseInvalidInput),
      async (context) => {
        const { code, round, playerId } = context.req.valid('param');
        const game = await writeEntry(
          { joinCode: code, roundNumber: round, playerId },
          context.req.valid('json'),
          readVisit(context),
        );
        return context.json({ game });
      },
    )
    .put(
      '/:code/rounds/:round',
      zValidator('param', roundParamSchema, refuseInvalidInput),
      zValidator('json', writeRoundSchema, refuseInvalidInput),
      async (context) => {
        const { code, round } = context.req.valid('param');
        const game = await writeRound(code, round, context.req.valid('json'), readVisit(context));
        return context.json({ game });
      },
    )
    .put(
      '/:code/phase',
      zValidator('param', joinCodeParamSchema, refuseInvalidInput),
      zValidator('json', movePhaseSchema, refuseInvalidInput),
      async (context) => {
        const { code } = context.req.valid('param');
        const game = await movePhase(code, context.req.valid('json'), readVisit(context));
        return context.json({ game });
      },
    )
    .patch(
      '/:code/players/:playerId',
      zValidator('param', playerParamSchema, refuseInvalidInput),
      zValidator('json', updatePlayerSchema, refuseInvalidInput),
      async (context) => {
        const { code, playerId } = context.req.valid('param');
        const game = await changePlayer(
          code,
          playerId,
          context.req.valid('json'),
          readVisit(context),
        );
        return context.json({ game });
      },
    )
    .post(
      '/:code/players/:playerId/claim',
      zValidator('param', playerParamSchema, refuseInvalidInput),
      async (context) => {
        const { code, playerId } = context.req.valid('param');
        const game = await claimSeat(code, playerId, readVisit(context));
        return context.json({ game });
      },
    )
    .post(
      '/:code/rematch',
      zValidator('param', joinCodeParamSchema, refuseInvalidInput),
      async (context) => {
        const { code } = context.req.valid('param');
        const game = await startRematch(code, readVisit(context));
        return context.json({ game }, CREATED);
      },
    );
}
