// @FollowsBlueprint utils-pure-module
import { type Check, PASS, refuse } from '../check.core.ts';
import { listSimpleCommands } from '../shell-command.core.ts';

const RULE = 'no-prettier';
const OXFMT_BINARY = 'node_modules/.bin/oxfmt';
const PACKAGE_RUNNERS = new Set(['npx', 'bunx', 'exec', 'dlx', 'pnpm', 'yarn']);

function isPrettier(word: string | undefined): boolean {
  return word?.split('/').at(-1) === 'prettier';
}

function isRunningPrettier(words: readonly string[]): boolean {
  if (isPrettier(words[0])) return true;
  return words.some((word, index) => {
    if (!PACKAGE_RUNNERS.has(word)) return false;
    const target = words.slice(index + 1).find((next) => !next.startsWith('-'));
    return isPrettier(target);
  });
}

export const noPrettier: Check = {
  name: RULE,
  tools: /^Bash$/u,
  run(input, world) {
    const command = input.tool_input?.['command'];
    if (typeof command !== 'string' || command === '') return PASS;
    if (world.readText(OXFMT_BINARY) === null) return PASS;
    const isAnyCommandPrettier = listSimpleCommands(command).some(({ name, args }) =>
      isRunningPrettier([name, ...args]),
    );
    if (!isAnyCommandPrettier) return PASS;
    return refuse(RULE, 'ran Prettier in a repository that formats with oxfmt', [
      'This repository formats with oxfmt, and Prettier rewrites lines oxfmt leaves alone.',
      'Format only the files you changed, with oxfmt:',
      '  pnpm exec oxfmt <files>          (writes)',
      '  pnpm exec oxfmt --check <files>  (checks)',
    ]);
  },
};
