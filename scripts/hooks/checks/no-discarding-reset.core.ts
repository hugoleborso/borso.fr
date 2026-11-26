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

const RULE = 'no-discarding-reset';
const UNREADABLE_DIRECTORY = 'unreadable';
const STARTING_DIRECTORY = '.';

const GIT_INVOCATION = String.raw`(^|[;&|({\s])git(\s+-C\s+[^\s;&|]+)?\s+`;
const DISCARDS_WORKING_TREE = new RegExp(
  String.raw`${GIT_INVOCATION}(reset\s+(--hard|--merge|--keep)|checkout\s+--\s|restore\s)`,
  'u',
);
const RESTORE = new RegExp(String.raw`${GIT_INVOCATION}restore\s`, 'u');
const STAGED_FLAG = /(^|\s)(--staged|-S)(\s|$)/u;
const WORKTREE_FLAG = /(^|\s)(--worktree|-W)(\s|$)/u;
const LEADING_GROUPING = /^[\s(){}!]+/u;
const CHANGE_DIRECTORY_TO = /^(cd|pushd)(\s+(\S+))?\s*$/u;
const CHANGE_DIRECTORY_OTHERWISE = /^(cd|pushd|popd)(\s|$)/u;
const EXPLICIT_DIRECTORY = /git\s+-C\s+(\S+)/u;
const SHELL_EXPANDED = /[$`"'*?]/u;
const CHECKOUT_WORD = /\scheckout\s/u;

interface Walk {
  readonly world: HookWorld;
  readonly baseArgs: readonly string[];
  readonly home: string;
}

function readCommand(input: HookInput): string {
  const command = input.tool_input?.['command'];
  return typeof command === 'string' ? command : '';
}

function refuseUnreadableCheckout(reason: string): Verdict {
  return refuse(RULE, 'ran a discarding git command on a checkout the hook could not read', [
    `cannot tell whether this discards uncommitted work: ${reason}.`,
    'The hook reads the command before the shell expands it, so a variable,',
    'a quoted path or a directory that does not exist names no checkout it can read.',
    'Name the checkout with a literal path:',
    '  git -C /absolute/path/to/worktree reset --hard',
  ]);
}

function resolveDirectory(base: string, path: string, home: string): string {
  const isUnreadable =
    base === UNREADABLE_DIRECTORY || path === '' || path === '-' || SHELL_EXPANDED.test(path);
  if (isUnreadable) return UNREADABLE_DIRECTORY;
  const expanded = path.startsWith('~') ? home + path.slice(1) : path;
  return expanded.startsWith('/') ? expanded : `${base}/${expanded}`;
}

function isStagedOnlyRestore(segment: string): boolean {
  return RESTORE.test(segment) && STAGED_FLAG.test(segment) && !WORKTREE_FLAG.test(segment);
}

function listNamedPaths(segment: string): string[] {
  const isCheckout = CHECKOUT_WORD.test(segment);
  const paths: string[] = [];
  let isSubcommandSeen = false;
  let isAfterSeparator = false;
  let isSkippingValue = false;
  for (const word of segment.split(/\s+/u).filter((part) => part !== '')) {
    if (!isSubcommandSeen) {
      isSubcommandSeen = word === 'restore' || word === 'checkout';
    } else if (isSkippingValue) {
      isSkippingValue = false;
    } else if (isAfterSeparator) {
      paths.push(word);
    } else if (word === '--') {
      isAfterSeparator = true;
    } else if (word === '-s' || word === '--source') {
      isSkippingValue = true;
    } else if (!word.startsWith('-') && !isCheckout) {
      paths.push(word);
    }
  }
  return paths;
}

function listOutputLines(stdout: string): string[] {
  const output = stdout.replace(/\n+$/u, '');
  return output === '' ? [] : output.split('\n');
}

function refuseDiscardingChanges(
  walk: Walk,
  segment: string,
  target: string,
  paths: readonly string[],
): Verdict {
  const changed = walk.world.run('git', [
    ...walk.baseArgs,
    '-C',
    target,
    'diff',
    '--name-only',
    '--',
    ...paths,
  ]);
  const stash =
    paths.length > 0
      ? `  git stash push -m 'before the probe' -- ${paths.join(' ')}`
      : "  git stash push -u -m 'before the probe'";
  return refuse(RULE, `ran \`${segment.slice(0, 120)}\`, which would discard uncommitted work`, [
    `\`${segment}\` discards tracked changes that are not committed in ${target}:`,
    ...listOutputLines(changed.stdout).map((path) => `    ${path}`),
    'Commit them first — a commit is cheap and amendable:',
    "  git add <those paths> && git commit -m 'wip'   …   git reset --soft HEAD~1",
    'Or park them where the command cannot reach:',
    stash,
  ]);
}

function judgeDiscard(walk: Walk, segment: string, currentDirectory: string): Verdict {
  const explicitDirectory = EXPLICIT_DIRECTORY.exec(segment)?.[1];
  const target =
    explicitDirectory === undefined
      ? currentDirectory
      : resolveDirectory(currentDirectory, explicitDirectory, walk.home);
  if (target === UNREADABLE_DIRECTORY) {
    return refuseUnreadableCheckout(
      `\`${segment}\` names its checkout through something only the shell can expand`,
    );
  }
  const gitArgs = [...walk.baseArgs, '-C', target];
  if (walk.world.run('git', [...gitArgs, 'rev-parse', '--is-inside-work-tree']).status !== 0) {
    return refuseUnreadableCheckout(`${target} is not a git checkout the hook can read`);
  }
  const paths = listNamedPaths(segment);
  const diffStatus = walk.world.run('git', [...gitArgs, 'diff', '--quiet', '--', ...paths]).status;
  if (diffStatus === 0) return PASS;
  if (diffStatus !== 1) return refuseUnreadableCheckout(`git diff failed in ${target}`);
  return refuseDiscardingChanges(walk, segment, target, paths);
}

function selectNextDirectory(
  segment: string,
  currentDirectory: string,
  home: string,
): string | null {
  const changeTo = CHANGE_DIRECTORY_TO.exec(segment);
  if (changeTo !== null) return resolveDirectory(currentDirectory, changeTo[3] || home, home);
  return CHANGE_DIRECTORY_OTHERWISE.test(segment) ? UNREADABLE_DIRECTORY : null;
}

export const noDiscardingReset: Check = {
  name: RULE,
  tools: /^Bash$/u,
  run(input, world): Verdict {
    const command = readCommand(input);
    if (command === '') return PASS;
    const walk: Walk = {
      world,
      baseArgs: input.cwd ? ['-C', input.cwd] : [],
      home: world.readEnvironment('HOME') ?? '',
    };
    let currentDirectory = STARTING_DIRECTORY;
    for (const rawSegment of stripStringBodies(command).split(/[;&|\n]/u)) {
      const segment = rawSegment.replace(LEADING_GROUPING, '');
      const nextDirectory = selectNextDirectory(segment, currentDirectory, walk.home);
      if (nextDirectory !== null) {
        currentDirectory = nextDirectory;
        continue;
      }
      if (!DISCARDS_WORKING_TREE.test(segment) || isStagedOnlyRestore(segment)) continue;
      const verdict = judgeDiscard(walk, segment, currentDirectory);
      if (verdict.kind !== 'pass') return verdict;
    }
    return PASS;
  },
};
