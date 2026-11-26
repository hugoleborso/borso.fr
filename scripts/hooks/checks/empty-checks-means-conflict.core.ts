// @FollowsBlueprint utils-pure-module
import { type Check, type HookInput, PASS, type Verdict } from '../check.core.ts';

const CHECK_METHODS = new Set(['get_check_runs', 'get_status']);
const INTEGER = /^-?[0-9]+$/u;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isJqAbsent(value: unknown): boolean {
  return value === undefined || value === null || value === false;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function parseChecksResponse(response: unknown): unknown {
  if (typeof response !== 'string') return response;
  const parsed = parseJson(response);
  if (typeof parsed !== 'string') return parsed;
  return parseJson(parsed) ?? {};
}

function renderJqText(value: unknown): string {
  if (isJqAbsent(value)) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function readTotal(parsed: unknown): string {
  return isRecord(parsed) ? renderJqText(parsed['total_count']) : '';
}

function readRunName(run: unknown): string {
  const name = isRecord(run) ? run['name'] : null;
  if (name === undefined || name === null) return '';
  return typeof name === 'string' ? name : JSON.stringify(name);
}

export function composeRunningNames(runs: readonly unknown[]): string {
  if (!runs.every((run) => run === null || isRecord(run))) return '';
  return runs
    .filter((run) => !isRecord(run) || run['status'] !== 'completed')
    .map(readRunName)
    .join(', ');
}

function parseIntegerTotal(total: string): number | null {
  const totalOrZero = total === '' ? '0' : total;
  return INTEGER.test(totalOrZero) ? Number(totalOrZero) : null;
}

function describeUnfinishedRuns(parsed: unknown, total: string, pullRequest: string): Verdict {
  if (!isRecord(parsed) || !Array.isArray(parsed['check_runs'])) return PASS;
  const runs: readonly unknown[] = parsed['check_runs'];
  const running = composeRunningNames(runs);
  const integerTotal = parseIntegerTotal(total);
  const isPagePartial = integerTotal !== null && runs.length < integerTotal;
  if (running === '' && integerTotal !== null && !isPagePartial) return PASS;
  const lines = [
    `[unfinished-checks] get_check_runs for pull request ${pullRequest} is not a verdict yet.`,
  ];
  if (running !== '') {
    lines.push(`Still running: ${running}. CI is not green until every run has completed;
say which are still going rather than calling the rest green.`);
  }
  if (isPagePartial) {
    lines.push(`This page shows ${runs.length} of ${total} runs. Read the rest (perPage up to 100, or the
next page) before saying anything about all of them.`);
  }
  return { kind: 'context', text: lines.join('\n') };
}

function describeEmptyChecks(method: string, pullRequest: string): Verdict {
  return {
    kind: 'context',
    text: `[empty-checks] ${method} returned no checks for pull request ${pullRequest}.

A conflicted pull request gets NO workflow run at all — GitHub cannot build
refs/pull/<n>/merge, so there is nothing to report and nothing that says why.
An empty checks list looks identical to a dropped webhook or an Actions outage,
and it is almost always the conflict.

Read the one field that settles it before concluding anything else:

  mcp__github__pull_request_read method:get  ->  .mergeable_state

"dirty" means conflict: merge the base branch in, resolve, push, and the checks
come back. See https://github.com/hugoleborso/borso.fr/blob/main/docs/knowledge/a-conflicted-pull-request-gets-no-checks.md.`,
  };
}

function readPullRequest(input: HookInput): string {
  const pullNumber = input.tool_input?.['pullNumber'];
  return isJqAbsent(pullNumber) ? 'the pull request' : renderJqText(pullNumber);
}

export const emptyChecksMeansConflict: Check = {
  name: 'empty-checks-means-conflict',
  tools: /^mcp__github__pull_request_read$/u,
  run: (input) => {
    const method = input.tool_input?.['method'];
    if (typeof method !== 'string' || !CHECK_METHODS.has(method)) return PASS;
    const response = input.tool_response;
    if (isJqAbsent(response) || response === '') return PASS;
    const parsed = parseChecksResponse(response);
    const total = readTotal(parsed);
    const pullRequest = readPullRequest(input);
    if (total === '0') return describeEmptyChecks(method, pullRequest);
    if (method !== 'get_check_runs') return PASS;
    return describeUnfinishedRuns(parsed, total, pullRequest);
  },
};
