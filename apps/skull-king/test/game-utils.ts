import { z } from 'zod';
import { createApp } from '@api/app';
import { pirateAvatarSchema } from '@domain/pirate-avatar.core';

const app = createApp();

const bonusesSchema = z
  .object({
    standardFourteen: z.number(),
    blackFourteen: z.number(),
    mermaidByPirate: z.number(),
    pirateBySkullKing: z.number(),
    skullKingByMermaid: z.number(),
    loot: z.number(),
  })
  .strict();

export const gameViewSchema = z
  .object({
    joinCode: z.string(),
    phase: z.enum(['bidding', 'scoring', 'finished']),
    currentRound: z.number(),
    rematchJoinCode: z.string().nullable(),
    revision: z.number(),
    players: z.array(
      z
        .object({
          id: z.string(),
          seat: z.number(),
          name: z.string(),
          icon: z.string(),
          color: z.string(),
          avatar: pirateAvatarSchema,
          accountId: z.string().nullable(),
        })
        .strict(),
    ),
    rounds: z.array(
      z
        .object({
          number: z.number(),
          cardCount: z.number(),
          isKrakenPlayed: z.boolean(),
          isWhiteWhaleDiscard: z.boolean(),
          entries: z.array(
            z
              .object({
                playerId: z.string(),
                bid: z.number().nullable(),
                bidAdjustment: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
                rascalBet: z.union([z.literal(0), z.literal(10), z.literal(20)]),
                isMissed: z.boolean(),
                tricks: z.number().nullable(),
                bonuses: bonusesSchema,
              })
              .strict(),
          ),
        })
        .strict(),
    ),
    readAt: z.iso.datetime(),
  })
  .strict();

const gameEnvelopeSchema = z.object({ game: gameViewSchema }).strict();
const errorEnvelopeSchema = z.object({ error: z.string() });

export type GameSnapshot = z.infer<typeof gameViewSchema>;
export type EntrySnapshot = GameSnapshot['rounds'][number]['entries'][number];

export const TABLE_OF_FOUR = [
  { name: 'Hugo', icon: 'skull', color: 'gold' },
  { name: 'Léa', icon: 'bird', color: 'ice' },
  { name: 'Max', icon: 'anchor', color: 'magenta' },
  { name: 'Inès', icon: 'crown', color: 'amethyst' },
];

export async function request(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return await app.request(path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function readBody(response: Response): Promise<unknown> {
  const responseBody: unknown = await response.json();
  return responseBody;
}

export async function readError(response: Response): Promise<string> {
  return errorEnvelopeSchema.parse(await readBody(response)).error;
}

// @FollowsBlueprint test-fixtures-reading-through-a-schema
export async function readGameEnvelope(response: Response): Promise<GameSnapshot> {
  return gameEnvelopeSchema.parse(await readBody(response)).game;
}

export async function createAGame(
  players: readonly unknown[] = TABLE_OF_FOUR,
): Promise<GameSnapshot> {
  return await readGameEnvelope(await request('POST', '/api/games', { players }));
}

export async function readGameView(joinCode: string): Promise<GameSnapshot> {
  return await readGameEnvelope(await request('GET', `/api/games/${joinCode}`));
}

export async function writeEntry(
  joinCode: string,
  round: number,
  playerId: string,
  body: unknown,
): Promise<Response> {
  return await request('PUT', `/api/games/${joinCode}/rounds/${round}/entries/${playerId}`, body);
}

export async function movePhase(joinCode: string, round: number, phase: string): Promise<Response> {
  return await request('PUT', `/api/games/${joinCode}/phase`, { round, phase });
}

export function seatId(game: GameSnapshot, seat: number): string {
  const player = game.players.find((candidate) => candidate.seat === seat);
  if (player === undefined) throw new Error(`no player at seat ${seat}`);
  return player.id;
}

export function entryOf(game: GameSnapshot, round: number, playerId: string): EntrySnapshot {
  const entry = game.rounds
    .find((candidate) => candidate.number === round)
    ?.entries.find((candidate) => candidate.playerId === playerId);
  if (entry === undefined) throw new Error(`no entry for ${playerId} in round ${round}`);
  return entry;
}

async function bidSoTheRoundBalances(game: GameSnapshot, round: number): Promise<void> {
  const cardCount = game.rounds.find((candidate) => candidate.number === round)?.cardCount ?? round;
  for (const player of game.players) {
    const bid = player.seat === 0 ? cardCount : 0;
    await writeEntry(game.joinCode, round, player.id, { bid });
  }
}

async function moveOrFail(joinCode: string, round: number, phase: string): Promise<GameSnapshot> {
  const response = await movePhase(joinCode, round, phase);
  if (response.status !== 200) throw new Error(`could not move to ${phase} of round ${round}`);
  return await readGameEnvelope(response);
}

export async function reachRound(
  created: GameSnapshot,
  round: number,
  phase: 'bidding' | 'scoring' | 'finished',
): Promise<GameSnapshot> {
  let game = created;
  for (let played = game.currentRound; played < round; played += 1) {
    await bidSoTheRoundBalances(game, played);
    await moveOrFail(game.joinCode, played, 'scoring');
    game = await moveOrFail(game.joinCode, played + 1, 'bidding');
  }
  if (phase === 'bidding') return game;
  await bidSoTheRoundBalances(game, round);
  game = await moveOrFail(game.joinCode, round, 'scoring');
  if (phase === 'scoring') return game;
  return await moveOrFail(game.joinCode, round, 'finished');
}
