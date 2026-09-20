import { z } from 'zod';
import { createApp } from '@api/app';
import { PLAYER_TOKEN_HEADER, PLAYER_TOKEN_SCHEME } from '@api/games/player-token.middleware';

const app = createApp();

const outcomeSchema = z.object({
  playerId: z.string(),
  bid: z.number(),
  stashBefore: z.number(),
  stashAfter: z.number(),
  crateWon: z.number(),
  tariffPaid: z.number(),
  tariffReceived: z.number(),
  busted: z.boolean(),
});

export const gameViewSchema = z.object({
  joinCode: z.string(),
  status: z.enum(['lobby', 'playing', 'finished']),
  maxPlayers: z.number(),
  freeSeats: z.number(),
  winningScore: z.number(),
  roundTimerSeconds: z.number().nullable(),
  crateBananas: z.number(),
  currentRound: z.number(),
  roundOpenedAt: z.string().nullable(),
  players: z.array(
    z.object({
      id: z.string(),
      nickname: z.string(),
      avatar: z.string(),
      stashBananas: z.number(),
      isHost: z.boolean(),
      hasBid: z.boolean(),
    }),
  ),
  lastRound: z
    .object({
      roundNumber: z.number(),
      crateBefore: z.number(),
      crateAfter: z.number(),
      outcomes: z.array(outcomeSchema),
    })
    .nullable(),
  rematchJoinCode: z.string().nullable(),
  winnerIds: z.array(z.string()),
  viewerId: z.string().nullable(),
  viewerBid: z.number().nullable(),
});

const seatedSchema = z.object({
  game: gameViewSchema,
  playerId: z.string(),
  playerToken: z.string(),
});

const gameEnvelopeSchema = z.object({ game: gameViewSchema });
const roundsEnvelopeSchema = z.object({
  rounds: z.array(
    z.object({
      roundNumber: z.number(),
      crateBefore: z.number(),
      crateAfter: z.number(),
      outcomes: z.array(outcomeSchema),
    }),
  ),
});
const errorEnvelopeSchema = z.object({ error: z.string() });

export type GameSnapshot = z.infer<typeof gameViewSchema>;
export type RoundsSnapshot = z.infer<typeof roundsEnvelopeSchema>['rounds'];
export type SeatedSnapshot = z.infer<typeof seatedSchema>;

export async function request(
  method: string,
  path: string,
  options: { body?: unknown; token?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options.token !== undefined) {
    headers[PLAYER_TOKEN_HEADER] = `${PLAYER_TOKEN_SCHEME} ${options.token}`;
  }
  return await app.request(path, {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
}

async function readBody(response: Response): Promise<unknown> {
  const responseBody: unknown = await response.json();
  return responseBody;
}

export async function readError(response: Response): Promise<string> {
  return errorEnvelopeSchema.parse(await readBody(response)).error;
}

export async function readGameEnvelope(response: Response): Promise<GameSnapshot> {
  return gameEnvelopeSchema.parse(await readBody(response)).game;
}

/**
 * @Blueprint test-fixtures-reading-through-a-schema
 * @BlueprintName Test Fixtures Reading Responses Through A Schema
 * @BlueprintUsage Use for the helpers a back end end to end suite drives its own API with, so no case has to assert a type onto a parsed body.
 * @BlueprintDescription Parses every response through a Zod envelope that mirrors the shape the API promises, which is what lets the helper return a precise type with no assertion anywhere and makes a renamed or dropped field fail the suite rather than reach a case as `undefined`. The envelope is written out by hand here rather than inferred from the API's own types on purpose: inferring it would make the test agree with the implementation by construction, and the point of writing it twice is that the two have to be changed together.
 */
export async function hostAGame(overrides: Record<string, unknown> = {}): Promise<SeatedSnapshot> {
  const response = await request('POST', '/api/games', {
    body: {
      nickname: 'Hugo',
      avatar: 'chimp',
      maxPlayers: 4,
      winningScore: 200,
      roundTimerSeconds: null,
      ...overrides,
    },
  });
  return seatedSchema.parse(await readBody(response));
}

export async function joinTheGame(
  joinCode: string,
  nickname: string,
  avatar: string,
): Promise<SeatedSnapshot> {
  const response = await request('POST', `/api/games/${joinCode}/players`, {
    body: { nickname, avatar },
  });
  return seatedSchema.parse(await readBody(response));
}

export async function startTheGame(joinCode: string, hostToken: string): Promise<GameSnapshot> {
  return await readGameEnvelope(
    await request('POST', `/api/games/${joinCode}/start`, { token: hostToken }),
  );
}

export async function bid(joinCode: string, token: string, amount: number): Promise<GameSnapshot> {
  return await readGameEnvelope(
    await request('POST', `/api/games/${joinCode}/bids`, { token, body: { amount } }),
  );
}

export async function readGameView(joinCode: string, token?: string): Promise<GameSnapshot> {
  return await readGameEnvelope(await request('GET', `/api/games/${joinCode}`, { token }));
}

export function stashOf(game: GameSnapshot, playerId: string): number {
  const player = game.players.find((candidate) => candidate.id === playerId);
  if (player === undefined) throw new Error(`no player ${playerId} in the game`);
  return player.stashBananas;
}

export async function readRounds(joinCode: string): Promise<RoundsSnapshot> {
  const response = await request('GET', `/api/games/${joinCode}/rounds`);
  return roundsEnvelopeSchema.parse(await readBody(response)).rounds;
}

export async function askForARematch(joinCode: string, token: string): Promise<GameSnapshot> {
  return await readGameEnvelope(await request('POST', `/api/games/${joinCode}/rematch`, { token }));
}

export async function claimMySeat(joinCode: string, token: string): Promise<SeatedSnapshot> {
  const response = await request('POST', `/api/games/${joinCode}/seat`, { token });
  return seatedSchema.parse(await readBody(response));
}
