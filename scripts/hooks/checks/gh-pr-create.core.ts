// @FollowsBlueprint utils-pure-module
import { resolve } from 'node:path';
import { validateBody } from '../../pr/pr-body.core.ts';
import { type Check, type HookWorld, PASS, refuse, type Verdict } from '../check.core.ts';
import { listSimpleCommands } from '../shell-command.core.ts';

const RULE = 'open-pr';
const CHECKER = 'scripts/pr/check-pr-body.ts';
const HEREDOC = /<<-?['"]?(?<tag>[A-Za-z_]\w*)['"]?(?<rest>[^\n]*)\n.*?\n\k<tag>(?:\n|$)/gsu;
const TRAILING_NEWLINES = /\n+$/u;
const HEAD_FLAG = /^.*--head[ =]([^ ]+).*$/su;
const BODY_FILE_FLAG = /--body-file\b/u;
const BODY_FILE_VALUE = /^.*--body-file[ =]([^ ]+).*$/su;
const BODY_FLAG = /--body\b/u;
const DOUBLE_QUOTED_BODY = /^.*--body[ =]"([^"]*)".*$/su;
const SINGLE_QUOTED_BODY = /^.*--body[ =]'([^']*)'.*$/su;
const KAIZEN_FILE = 'KAIZEN.md';
const LOGGED_ENTRY = /^- \[/u;
const ARCHIVED_KAIZEN = /^docs\/features\/.*\/kaizen\.md$/u;
const CHECKER_TITLE = '# title placeholder for the checker';
const CHECKER_SUBJECT = 'the body';

type BodyReading = { readonly body: string } | { readonly verdict: Verdict };

function trimTrailingNewlines(text: string): string {
  return text.replace(TRAILING_NEWLINES, '');
}

export function stripHeredocs(command: string): string {
  return trimTrailingNewlines(command.replace(HEREDOC, '$<rest>\n'));
}

export function isRunningPullRequestCreate(command: string): boolean {
  return listSimpleCommands(command).some(
    ({ name, args }) => name === 'gh' && args[0] === 'pr' && args[1] === 'create',
  );
}

function readMatchingLines(text: string, pattern: RegExp): string {
  return text
    .split('\n')
    .flatMap((line) => pattern.exec(line)?.slice(1, 2) ?? [])
    .join('\n');
}

export function readHeadBranch(commandToRun: string): string {
  return readMatchingLines(commandToRun, HEAD_FLAG);
}

function readBodyFilePath(commandToRun: string): string {
  const lines = commandToRun.split('\n').map((line) => line.replace(BODY_FILE_VALUE, '$1'));
  return trimTrailingNewlines(lines.join('\n'));
}

function refuseOpenPr(reason: string): Verdict {
  return refuse(RULE, `refused gh pr create: ${reason}`, [
    reason,
    'Draft from .claude/skills/open-pr/template.md and check it with',
    `  node_modules/.bin/tsx ${CHECKER} <draft.md>`,
  ]);
}

function readBodyFile(bodyPath: string, directory: string, world: HookWorld): BodyReading | null {
  if (bodyPath === '-') return null;
  if (bodyPath.includes('$')) {
    return {
      verdict: refuseOpenPr(
        `--body-file names a shell variable, ${bodyPath}, which this hook reads before the shell expands it; pass the literal path`,
      ),
    };
  }
  const content = world.readText(resolve(directory, bodyPath));
  if (content === null) {
    return {
      verdict: refuseOpenPr(
        `--body-file points at a missing path: ${bodyPath}. This hook reads it before the command runs, so write it in an earlier call`,
      ),
    };
  }
  return { body: trimTrailingNewlines(content) };
}

function readBody(commandToRun: string, directory: string, world: HookWorld): BodyReading | null {
  if (BODY_FILE_FLAG.test(commandToRun)) {
    return readBodyFile(readBodyFilePath(commandToRun), directory, world);
  }
  if (!BODY_FLAG.test(commandToRun)) {
    return {
      verdict: refuseOpenPr('no --body / --body-file flag — PRs without a body are rejected.'),
    };
  }
  const doubleQuoted = readMatchingLines(commandToRun, DOUBLE_QUOTED_BODY);
  return {
    body: doubleQuoted === '' ? readMatchingLines(commandToRun, SINGLE_QUOTED_BODY) : doubleQuoted,
  };
}

function countArchivedKaizen(commandToRun: string, world: HookWorld): number {
  const head = readHeadBranch(commandToRun);
  const comparedHead = head === '' ? 'HEAD' : `origin/${head}`;
  const { stdout } = world.run('git', ['diff', '--name-only', `origin/main...${comparedHead}`]);
  return stdout.split('\n').filter((path) => ARCHIVED_KAIZEN.test(path)).length;
}

function checkFrictionLogArchived(commandToRun: string, world: HookWorld): Verdict {
  const frictionLog = world.readText(KAIZEN_FILE);
  if (frictionLog === null) return PASS;
  const logged = frictionLog.split('\n').filter((line) => LOGGED_ENTRY.test(line)).length;
  if (logged === 0 || countArchivedKaizen(commandToRun, world) > 0) return PASS;
  return refuse(
    RULE,
    'opened a pull request leaving the friction log where the sweep cannot read it',
    [
      `the friction log holds ${String(logged)} entr(y/ies) and this branch commits no archive of it.`,
      'A gitignored file does not reach the sweep, which may run on another machine.',
      '  scripts/kaizen.sh archive <docs-slug>/<feature>   then commit it',
    ],
  );
}

function checkBodyBudget(body: string): Verdict {
  const violations = validateBody(`${CHECKER_TITLE}\n\n${body}\n`);
  if (violations.length === 0) return PASS;
  const report = [
    ...violations.map(({ where, problem }) => `[pr-body] ${where}: ${problem}`),
    `[pr-body] ${String(violations.length)} violation(s) in ${CHECKER_SUBJECT}`,
  ].join('\n');
  return refuseOpenPr(`the body is outside the budget: ${report}`);
}

export const ghPrCreate: Check = {
  name: 'gh-pr-create',
  tools: /^Bash$/u,
  run(input, world) {
    const requested = input.tool_input?.['command'];
    const command = typeof requested === 'string' ? trimTrailingNewlines(requested) : '';
    if (command === '' || !isRunningPullRequestCreate(command)) return PASS;
    const commandToRun = stripHeredocs(command);
    const reading = readBody(commandToRun, input.cwd ?? world.projectDirectory, world);
    if (reading === null) return PASS;
    if ('verdict' in reading) return reading.verdict;
    const frictionVerdict = checkFrictionLogArchived(commandToRun, world);
    if (frictionVerdict.kind !== 'pass') return frictionVerdict;
    return checkBodyBudget(reading.body);
  },
};
