import { createApp } from './app';
import { buildGameCommandRunner } from './games/game-command.client';
import {
  type CommandReply,
  IN_PROCESS_BASE_URL,
  readCommandLine,
  selectExitCode,
} from './games/game-command.core';

const FIRST_ARGUMENT_INDEX = 2;
const INDENTATION = 2;

function printToStandardError(line: string): void {
  process.stderr.write(`${line}\n`);
}

const app = createApp(printToStandardError);
const runCommand = buildGameCommandRunner(IN_PROCESS_BASE_URL, app.request);

async function answerCommandLine(argv: readonly string[]): Promise<CommandReply> {
  const commandLine = readCommandLine(argv);
  if (commandLine.isRefusal) return commandLine.reply;
  return await runCommand(commandLine.command);
}

// @FollowsBlueprint api-dev-entrypoint
const reply = await answerCommandLine(process.argv.slice(FIRST_ARGUMENT_INDEX));
process.stdout.write(`${JSON.stringify(reply.output, null, INDENTATION)}\n`, () => {
  process.exit(selectExitCode(reply));
});
