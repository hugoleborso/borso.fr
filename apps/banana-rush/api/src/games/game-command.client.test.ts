import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { truncateAllTables } from '../../../test/database-utils';
import { createApp } from '../app';
import { buildGameCommandRunner } from './game-command.client';
import { type CommandReply, IN_PROCESS_BASE_URL, readCommandLine } from './game-command.core';

const app = createApp();
const runCommand = buildGameCommandRunner(IN_PROCESS_BASE_URL, app.request);

const tableSchema = z.object({
  game: z.object({
    joinCode: z.string(),
    status: z.enum(['lobby', 'playing', 'finished']),
    currentRound: z.number(),
    crateBananas: z.number(),
    players: z.array(z.object({ id: z.string(), stashBananas: z.number() })),
  }),
  moves: z.array(z.string()),
});

const seatSchema = tableSchema.extend({ playerId: z.string(), playerToken: z.string() });
const refusalSchema = z.object({ error: z.string() });

async function type(commandLine: string): Promise<CommandReply> {
  const read = readCommandLine(commandLine.split(' '));
  if (read.isRefusal) return read.reply;
  return await runCommand(read.command);
}

async function seat(commandLine: string): Promise<z.infer<typeof seatSchema>> {
  return seatSchema.parse((await type(commandLine)).output);
}

async function table(commandLine: string): Promise<z.infer<typeof tableSchema>> {
  return tableSchema.parse((await type(commandLine)).output);
}

async function refusal(commandLine: string): Promise<string> {
  const reply = await type(commandLine);
  expect(reply.isSuccess).toBe(false);
  return refusalSchema.parse(reply.output).error;
}

/**
 * @Blueprint test-whole-game-typed-at-a-command-line
 * @BlueprintName Test Of A Whole Game Typed At A Command Line
 * @BlueprintUsage Use for proving that the command line reaches the same rules as the interface, by playing the application from the words an agent would type.
 * @BlueprintDescription Each step is one line of text read by the same function the entry point calls and run through the in-process application, so the case exercises the flag parsing, the HTTP route, the service and the database in one pass with no server and no socket. The assertions read the moves the reply offers as well as the state, because the moves are what an agent decides on next, and a rule that changed what the screen allows has to change what the terminal allows in the same breath.
 */
describe('a game of Banana Rush played from the command line', () => {
  beforeEach(async () => {
    await truncateAllTables();
  });

  it('plays a lobby through to a resolved round, offering only the moves each player may make', async () => {
    const host = await seat(
      'create --nickname Hugo --avatar chimp --maxPlayers 2 --winningScore 100',
    );
    const code = host.game.joinCode;

    expect(host.moves).toEqual([]);

    const guest = await seat(`join --code ${code.toLowerCase()} --nickname Zoe --avatar lemur`);
    const hostView = await table(`show --code ${code} --token ${host.playerToken}`);

    expect(guest.moves).toEqual([]);
    expect(hostView.moves).toEqual(['start']);
    expect((await table(`show --code ${code}`)).moves).toEqual([]);

    const started = await table(`start --code ${code} --token ${host.playerToken}`);

    expect(started.game.status).toBe('playing');
    expect(started.moves).toEqual(['bid']);

    const afterFirstBid = await table(`bid --code ${code} --token ${host.playerToken} --amount 8`);

    expect(afterFirstBid.moves).toEqual([]);
    expect(afterFirstBid.game.currentRound).toBe(1);

    const resolved = await table(`bid --code ${code} --token ${guest.playerToken} --amount 3`);

    expect(resolved.game.currentRound).toBe(2);
    expect(resolved.moves).toEqual(['bid']);
  });

  it('answers a guest who tries to start with the same refusal the screen translates', async () => {
    const host = await seat(
      'create --nickname Hugo --avatar chimp --maxPlayers 2 --winningScore 100',
    );
    const guest = await seat(`join --code ${host.game.joinCode} --nickname Zoe --avatar lemur`);

    expect(await refusal(`start --code ${host.game.joinCode} --token ${guest.playerToken}`)).toBe(
      'not-host',
    );
  });

  it('refuses a bid out of bounds before it reaches the application', async () => {
    expect(await refusal('bid --code ABCD --token t --amount 0')).toBe('invalid-command');
  });

  it('answers a code that matches no game', async () => {
    expect(await refusal('show --code ZZZZ')).toBe('game-not-found');
  });
});
