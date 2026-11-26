// @FollowsBlueprint utils-pure-module
import { type Check, PASS, refuse } from '../check.core.ts';
import { listSimpleCommands } from '../shell-command.core.ts';

const RULE = 'no-test-double-dash';
const TEST_SCRIPT = /^test(:[a-z0-9-]+)?$/u;

function isPassingDoubleDashToTest(args: readonly string[]): boolean {
  return args.some(
    (word, index) =>
      word === 'run' && TEST_SCRIPT.test(args[index + 1] ?? '') && args[index + 2] === '--',
  );
}

export const noTestDoubleDash: Check = {
  name: RULE,
  tools: /^Bash$/u,
  run(input) {
    const command = input.tool_input?.['command'];
    if (typeof command !== 'string' || command === '') return PASS;
    const isAnyCommandPassingDoubleDash = listSimpleCommands(command).some(
      ({ name, args }) => name === 'pnpm' && isPassingDoubleDashToTest(args),
    );
    if (!isAnyCommandPassingDoubleDash) return PASS;
    return refuse(RULE, 'passed -- to a pnpm test script, which makes Vitest run every file', [
      'pnpm passes the -- on to Vitest, which then drops your file filter and runs every file.',
      'Drop the --:',
      '  pnpm --filter <pkg> run test:e2e <files>',
      'Or call Vitest with its project:',
      '  pnpm exec vitest run --project <name> <files>',
    ]);
  },
};
