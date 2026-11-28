// @FollowsBlueprint utils-pure-module
import { resolve } from 'node:path';
import { validateBody } from '../../pr/pr-body.core.ts';
import { type Check, type HookWorld, PASS, refuse, type Verdict } from '../check.core.ts';
import { listSimpleCommands, stripHeredocBodies } from '../shell-command.core.ts';

const RULE = 'open-pr';
const CHECKER = 'scripts/pr/check-pr-body.ts';
const TRAILING_NEWLINES = /\n+$/u;
const HEAD_FLAG = /^.*--head[ =]([^ ]+).*$/su;
const BODY_FILE_FLAG = /--body-file\b/u;
const BODY_FILE_VALUE = /^.*--body-file[ =]([^ ]+).*$/su;
const BODY_FLAG = /--body\b/u;
const DOUBLE_QUOTED_BODY = /^.*--body[ =]"([^"]*)".*$/su;
const SINGLE_QUOTED_BODY = /^.*--body[ =]'([^']*)'.*$/su;
const CHECKER_TITLE = '# title placeholder for the checker';
const CHECKER_SUBJECT = 'the body';

type BodyReading = { readonly body: string } | { readonly verdict: Verdict };

function trimTrailingNewlines(text: string): string {
  return text.replace(TRAILING_NEWLINES, '');
}

export function stripHeredocs(command: string): string {
  return trimTrailingNewlines(stripHeredocBodies(command));
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
  const bodyFileLine = commandToRun.split('\n').find((line) => BODY_FILE_FLAG.test(line));
  if (bodyFileLine !== undefined) {
    return readBodyFile(bodyFileLine.replace(BODY_FILE_VALUE, '$1'), directory, world);
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
    if (typeof requested !== 'string') return PASS;
    const command = trimTrailingNewlines(requested);
    if (!isRunningPullRequestCreate(command)) return PASS;
    const commandToRun = stripHeredocs(command);
    const reading = readBody(commandToRun, input.cwd ?? world.projectDirectory, world);
    if (reading === null) return PASS;
    if ('verdict' in reading) return reading.verdict;
    return checkBodyBudget(reading.body);
  },
};
