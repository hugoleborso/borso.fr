// @FollowsBlueprint utils-pure-module
import {
  type Check,
  type HookInput,
  type HookWorld,
  PASS,
  refuse,
  type Verdict,
} from '../check.core.ts';
import { stripStringBodies } from '../shell-command.core.ts';

const RULE = 'no-shared-checkout-switch';

const SWITCH = /(^|[;&|]|\bthen\b|\bdo\b)\s*git\s+(-C\s+\S+\s+)?(switch|checkout)\b[^;&|]*/u;
const PATH_RESTORE = /\s(--|-p|--patch)(\s|$)/u;
const LEADING_CD = /^\s*cd\s+([^\s;&|]+)/u;
const EXPLICIT_DIRECTORY = /.*git\s+-C\s+(\S+)/u;

function readCommand(input: HookInput): string {
  const command = input.tool_input?.['command'];
  return typeof command === 'string' ? command : '';
}

function findFirstMatch(lines: readonly string[], pattern: RegExp): RegExpExecArray | null {
  for (const line of lines) {
    const match = pattern.exec(line);
    if (match !== null) return match;
  }
  return null;
}

function selectTarget(
  input: HookInput,
  world: HookWorld,
  lines: readonly string[],
  switchText: string,
): string {
  const leadingCd = findFirstMatch(lines, LEADING_CD)?.[1];
  const explicitDirectory = EXPLICIT_DIRECTORY.exec(switchText)?.[1];
  return explicitDirectory ?? leadingCd ?? (input.cwd || world.projectDirectory);
}

function readGitPath(
  world: HookWorld,
  baseArgs: readonly string[],
  target: string,
  flag: string,
): string {
  const result = world.run('git', [
    ...baseArgs,
    '-C',
    target,
    'rev-parse',
    '--path-format=absolute',
    flag,
  ]);
  return result.status === 0 ? result.stdout.trim() : '';
}

export const noSharedCheckoutSwitch: Check = {
  name: RULE,
  tools: /^Bash$/u,
  run(input, world): Verdict {
    if (world.readEnvironment('CLAUDE_CODE_REMOTE') === 'true') return PASS;
    const command = readCommand(input);
    if (command === '') return PASS;
    const lines = stripStringBodies(command).split('\n');
    const switchText = findFirstMatch(lines, SWITCH)?.[0];
    if (switchText === undefined || PATH_RESTORE.test(switchText)) return PASS;
    const target = selectTarget(input, world, lines, switchText);
    const baseArgs = input.cwd ? ['-C', input.cwd] : [];
    const ownGitDirectory = readGitPath(world, baseArgs, target, '--git-dir');
    const sharedGitDirectory = readGitPath(world, baseArgs, target, '--git-common-dir');
    if (ownGitDirectory === '' || ownGitDirectory !== sharedGitDirectory) return PASS;
    return refuse(RULE, 'switched branches in the main checkout other local sessions share', [
      `${target} is the main checkout, and other local sessions work in it too.`,
      'A branch switch here moves their HEAD, and their next commit lands on your branch.',
      'Work on a branch in a worktree of your own:',
      '  git worktree add <scratchpad>/<label> -b <branch> origin/main',
      "To discard a file's changes, use git restore <file>, which leaves the branch alone.",
    ]);
  },
};
