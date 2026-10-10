import { parseArgs } from 'node:util';
import { type GameCommand, gameCommandSchema } from './games.schema';

export interface CommandReply {
  readonly isSuccess: boolean;
  readonly output: unknown;
}

export type ReadCommandLine =
  | { readonly isRefusal: false; readonly command: GameCommand }
  | { readonly isRefusal: true; readonly reply: CommandReply };

export const IN_PROCESS_BASE_URL = 'http://banana-rush.in-process';

const SUCCESS_EXIT_CODE = 0;
const FAILURE_EXIT_CODE = 1;

export const COMMAND_USAGE = [
  'create  --nickname <name> --avatar <monkey> --maxPlayers <2-8> --winningScore <100|200|500> [--roundTimerSeconds <5|10|15|30|60>]',
  'join    --code <ABCD> --nickname <name> --avatar <monkey>',
  'start   --code <ABCD> --token <player token>',
  'bid     --code <ABCD> --token <player token> --amount <bananas>',
  'resolve --code <ABCD> [--token <player token>]',
  'show    --code <ABCD> [--token <player token>]',
  'rounds  --code <ABCD>',
  'rematch --code <ABCD> --token <player token>',
] as const;

const FLAG_NAMES = [
  'nickname',
  'avatar',
  'maxPlayers',
  'winningScore',
  'roundTimerSeconds',
  'code',
  'token',
  'amount',
] as const;

const STRING_FLAGS = Object.fromEntries(
  FLAG_NAMES.map((name) => [name, { type: 'string' as const }]),
);

function readFlags(argv: readonly string[]): Record<string, unknown> {
  const { values, positionals } = parseArgs({
    args: [...argv],
    options: STRING_FLAGS,
    strict: false,
    allowPositionals: true,
  });
  return { ...values, command: positionals[0] };
}

/**
 * @Blueprint core-command-line-read-through-the-api-schema
 * @BlueprintName Core Command Line Read Through The Api Schema
 * @BlueprintUsage Use for a command line that drives an application's own operations, so a terminal and an agent reach the same rules as the interface.
 * @BlueprintDescription Turns the words typed after the command into the same input the HTTP route accepts, through a schema built from the route's own Zod fields, so a bound changed for the form is changed for the terminal in the same edit. Every flag arrives as a string and is coerced before the route's rule reads it, which is the only difference between the two doors. A refusal is returned as a value carrying the schema's own issues and the usage, never thrown, so the entry point that prints it holds no branch and a test reads the refusal directly.
 */
export function readCommandLine(argv: readonly string[]): ReadCommandLine {
  const commandCheck = gameCommandSchema.safeParse(readFlags(argv));
  if (commandCheck.success) return { isRefusal: false, command: commandCheck.data };
  const issues = commandCheck.error.issues.map(({ path, message }) => ({ path, message }));
  return {
    isRefusal: true,
    reply: { isSuccess: false, output: { error: 'invalid-command', issues, usage: COMMAND_USAGE } },
  };
}

export function selectExitCode(reply: CommandReply): number {
  return reply.isSuccess ? SUCCESS_EXIT_CODE : FAILURE_EXIT_CODE;
}
