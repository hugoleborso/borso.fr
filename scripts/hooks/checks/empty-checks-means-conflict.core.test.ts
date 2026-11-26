import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import {
  emptyChecksMeansConflict,
  composeRunningNames,
  parseChecksResponse,
} from './empty-checks-means-conflict.core.ts';

const UNUSED_WORLD: HookWorld = {
  projectDirectory: '/repo',
  readEnvironment: () => undefined,
  readText: () => null,
  run: () => ({ status: 0, stdout: '', stderr: '' }),
};

const EMPTY_CHECKS_NOTE = `[empty-checks] get_status returned no checks for pull request 12.

A conflicted pull request gets NO workflow run at all — GitHub cannot build
refs/pull/<n>/merge, so there is nothing to report and nothing that says why.
An empty checks list looks identical to a dropped webhook or an Actions outage,
and it is almost always the conflict.

Read the one field that settles it before concluding anything else:

  mcp__github__pull_request_read method:get  ->  .mergeable_state

"dirty" means conflict: merge the base branch in, resolve, push, and the checks
come back. See https://github.com/hugoleborso/borso.fr/blob/main/docs/knowledge/a-conflicted-pull-request-gets-no-checks.md.`;

function checksRead(method: unknown, response: unknown, pullNumber: unknown = 12): HookInput {
  return {
    hook_event_name: 'PostToolUse',
    tool_name: 'mcp__github__pull_request_read',
    tool_input: { method, pullNumber },
    tool_response: response,
  };
}

function contextOf(input: HookInput): string | null {
  const verdict = emptyChecksMeansConflict.run(input, UNUSED_WORLD);
  return verdict.kind === 'context' ? verdict.text : null;
}

const COMPLETED = { name: 'lint', status: 'completed' };

// @FollowsBlueprint test-pure-unit
describe('parseChecksResponse', () => {
  it('keeps a parsed response and parses a text one', () => {
    expect(parseChecksResponse({ total_count: 1 })).toEqual({ total_count: 1 });
    expect(parseChecksResponse('{"total_count":0}')).toEqual({ total_count: 0 });
  });

  it('reads text that is not JSON as null', () => {
    expect(parseChecksResponse('not json')).toBeNull();
  });

  it('parses a JSON string once more, and reads a failed second parse as an empty object', () => {
    expect(parseChecksResponse(JSON.stringify('{"total_count":0}'))).toEqual({ total_count: 0 });
    expect(parseChecksResponse(JSON.stringify('nope'))).toEqual({});
  });
});

describe('composeRunningNames', () => {
  it('joins the names of runs not completed, reading a null run or a missing name as empty', () => {
    expect(
      composeRunningNames([
        COMPLETED,
        { name: 'test' },
        { name: 'e2e', status: 'in_progress' },
        null,
        { name: false, status: 'queued' },
        { name: { id: 1 } },
        { status: 'queued' },
      ]),
    ).toBe('test, e2e, , false, {"id":1}, ');
  });

  it('reads nothing when a run is neither an object nor null, as jq failed on it', () => {
    expect(composeRunningNames([{ name: 'test' }, 'oops'])).toBe('');
  });
});

describe('emptyChecksMeansConflict', () => {
  it('fires on mcp__github__pull_request_read only', () => {
    expect(emptyChecksMeansConflict.tools?.test('mcp__github__pull_request_read')).toBe(true);
    expect(emptyChecksMeansConflict.tools?.test('mcp__github__pull_request_reads')).toBe(false);
  });

  it('names the conflict field when a checks read comes back empty', () => {
    expect(contextOf(checksRead('get_status', '{"total_count": 0, "statuses": []}'))).toBe(
      EMPTY_CHECKS_NOTE,
    );
    expect(contextOf(checksRead('get_check_runs', { total_count: '0' }, 'x'))).toContain(
      '[empty-checks] get_check_runs returned no checks for pull request x.',
    );
  });

  it('says "the pull request" when the input names no number', () => {
    expect(contextOf(checksRead('get_status', { total_count: 0 }, null))).toContain(
      'for pull request the pull request.',
    );
    expect(contextOf(checksRead('get_status', { total_count: 0 }, false))).toContain(
      'for pull request the pull request.',
    );
  });

  it('renders a pull number that is not text the way jq prints it', () => {
    expect(contextOf(checksRead('get_status', { total_count: 0 }, { id: 1 }))).toContain(
      'for pull request {"id":1}.',
    );
    expect(contextOf(checksRead('get_status', { total_count: 0 }, true))).toContain(
      'for pull request true.',
    );
  });

  it('stays silent on other methods and on an empty or missing response', () => {
    expect(emptyChecksMeansConflict.run(checksRead('get', { total_count: 0 }), UNUSED_WORLD)).toBe(
      PASS,
    );
    expect(emptyChecksMeansConflict.run(checksRead(3, { total_count: 0 }), UNUSED_WORLD)).toBe(
      PASS,
    );
    expect(emptyChecksMeansConflict.run(checksRead('get_status', ''), UNUSED_WORLD)).toBe(PASS);
    expect(emptyChecksMeansConflict.run(checksRead('get_status', null), UNUSED_WORLD)).toBe(PASS);
    expect(emptyChecksMeansConflict.run({ hook_event_name: 'PostToolUse' }, UNUSED_WORLD)).toBe(
      PASS,
    );
  });

  it('stays silent on a get_status with checks, and reads runs only from get_check_runs', () => {
    const response = { total_count: 2, check_runs: [{ name: 'e2e', status: 'queued' }] };

    expect(
      emptyChecksMeansConflict.run(checksRead('get_status', { total_count: 2 }), UNUSED_WORLD),
    ).toBe(PASS);
    expect(emptyChecksMeansConflict.run(checksRead('get_status', response), UNUSED_WORLD)).toBe(
      PASS,
    );
  });

  it('stays silent when every run on the page completed and the page holds them all', () => {
    const response = { total_count: 1, check_runs: [COMPLETED] };

    expect(emptyChecksMeansConflict.run(checksRead('get_check_runs', response), UNUSED_WORLD)).toBe(
      PASS,
    );
  });

  it('stays silent when the runs are not a list or the response is not an object', () => {
    for (const response of ['{"total_count": 3}', 'garbage', [COMPLETED], { check_runs: {} }]) {
      expect(
        emptyChecksMeansConflict.run(checksRead('get_check_runs', response), UNUSED_WORLD),
      ).toBe(PASS);
    }
  });

  it('reads a missing total as zero, so a complete page with no total is a verdict', () => {
    const response = { check_runs: [COMPLETED] };

    expect(emptyChecksMeansConflict.run(checksRead('get_check_runs', response), UNUSED_WORLD)).toBe(
      PASS,
    );
  });

  it('names the runs still going', () => {
    const response = { total_count: 2, check_runs: [COMPLETED, { name: 'e2e', status: 'queued' }] };

    expect(contextOf(checksRead('get_check_runs', response))).toBe(
      `[unfinished-checks] get_check_runs for pull request 12 is not a verdict yet.
Still running: e2e. CI is not green until every run has completed;
say which are still going rather than calling the rest green.`,
    );
  });

  it('names a page that leaves runs out, alongside the runs still going', () => {
    const response = { total_count: 30, check_runs: [{ name: 'e2e', status: 'queued' }] };

    expect(contextOf(checksRead('get_check_runs', response))).toBe(
      `[unfinished-checks] get_check_runs for pull request 12 is not a verdict yet.
Still running: e2e. CI is not green until every run has completed;
say which are still going rather than calling the rest green.
This page shows 1 of 30 runs. Read the rest (perPage up to 100, or the
next page) before saying anything about all of them.`,
    );
  });

  it('keeps only the header when the total is not an integer, as bash failed to compare it', () => {
    const response = { total_count: 'many', check_runs: [COMPLETED] };

    expect(contextOf(checksRead('get_check_runs', response))).toBe(
      '[unfinished-checks] get_check_runs for pull request 12 is not a verdict yet.',
    );
    expect(contextOf(checksRead('get_check_runs', { total_count: { n: 1 }, check_runs: [] }))).toBe(
      '[unfinished-checks] get_check_runs for pull request 12 is not a verdict yet.',
    );
  });
});
