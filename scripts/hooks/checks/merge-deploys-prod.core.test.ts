import { describe, expect, it } from 'vitest';
import type { CommandResult, HookInput, HookWorld } from '../check.core.ts';
import { mergeDeploysProd } from './merge-deploys-prod.core.ts';

const SHA = 'abc123';
const SNAPSHOT = 'infra/shared/test/unit/__snapshots__/borso-shared.template.json';
const CHECK_RUNS_JQ = '.check_runs[] | "\\(.name)\\t\\(.status)\\t\\(.conclusion // "")"';
const CI_START_JQ =
  '[.check_runs[] | select(.app.slug == "github-actions") | .started_at] | min // empty';
const CHECK_RUNS = `gh api repos/hugoleborso/borso.fr/commits/${SHA}/check-runs?per_page=100 --jq`;

function ok(stdout = ''): CommandResult {
  return { status: 0, stdout, stderr: '' };
}

const FAILED: CommandResult = { status: 1, stdout: '', stderr: 'failed' };

const HAPPY: Record<string, CommandResult> = {
  'sh -c command -v gh': ok('/usr/bin/gh\n'),
  'gh api repos/hugoleborso/borso.fr/pulls/412 --jq .head.sha': ok(`${SHA}\n`),
  [`git cat-file -e ${SHA}^{commit}`]: ok(),
  [`/repository/node_modules/.bin/tsx /repository/scripts/pr/deploy-fanout.ts origin/main ${SHA}`]:
    ok('pragma\n'),
  [`git diff --name-only origin/main...${SHA}`]: ok(`apps/pragma/a.ts\n${SNAPSHOT}\n`),
  [`${CHECK_RUNS} ${CHECK_RUNS_JQ}`]: ok('build\tcompleted\tsuccess\nlint\tcompleted\tskipped\n'),
  [`${CHECK_RUNS} ${CI_START_JQ}`]: ok('\n'),
};

const READABLE = new Set(['node_modules/.bin/tsx', 'scripts/pr/deploy-fanout.ts']);

function createWorld(
  answers: Record<string, CommandResult>,
  readable: ReadonlySet<string> = READABLE,
): { world: HookWorld; calls: string[] } {
  const calls: string[] = [];
  const world: HookWorld = {
    projectDirectory: '/repository',
    readEnvironment: () => undefined,
    readText: (path) => (readable.has(path) ? 'content' : null),
    run: (command, args) => {
      const call = [command, ...args].join(' ');
      calls.push(call);
      return answers[call] ?? FAILED;
    },
  };
  return { world, calls };
}

function mergeCall(fields: Record<string, unknown> = {}): HookInput {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: 'mcp__github__merge_pull_request',
    tool_input: { owner: 'hugoleborso', repo: 'borso.fr', pullNumber: 412, ...fields },
  };
}

function bash(command: unknown): HookInput {
  return { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } };
}

function writeNotice(
  pullRequest: string,
  applications: string,
  shared: string,
  checks: string,
  movedBase = '',
): string {
  return `[merge-deploys-prod] merging pull request ${pullRequest} into main deploys to production.

There is no approval step after this call. Pushing to main runs
.github/workflows/deploy.yml, which deploys each affected application to prod
automatically. The merge is the gate, and this call is the merge.

  Applications this merge deploys: ${applications}
  shared-deploy dispatch owed:     ${shared}
  Checks on the head:              ${checks}

Merge only on an explicit instruction from the operator for THIS pull request.
After it lands, surface both post-merge follow-ups of CLAUDE.md's
Self-improvement loop, the shared-deploy dispatch and the kaizen, as it
words them.${movedBase}`;
}

const SHARED_OWED =
  'YES — the committed borso-shared template moved, so a shared-deploy dispatch is owed after this merge';
const HEAD_UNREADABLE = 'unknown — the check runs of this head could not be read';

function noticeOf(verdict: ReturnType<typeof mergeDeploysProd.run>): string {
  return verdict.kind === 'context' ? verdict.text : `not a notice: ${verdict.kind}`;
}

// @FollowsBlueprint test-pure-unit
describe('mergeDeploysProd', () => {
  it('fires on the MCP merge and on Bash', () => {
    expect(mergeDeploysProd.tools?.test('mcp__github__merge_pull_request')).toBe(true);
    expect(mergeDeploysProd.tools?.test('Bash')).toBe(true);
    expect(mergeDeploysProd.tools?.test('mcp__github__create_pull_request')).toBe(false);
  });

  it('names what a merge deploys before it runs, because the merge is the prod deploy', () => {
    const { world, calls } = createWorld(HAPPY);
    expect(mergeDeploysProd.run(mergeCall(), world)).toEqual({
      kind: 'context',
      text: writeNotice('412', 'pragma', SHARED_OWED, 'green'),
    });
    expect(calls[1]).toBe('git fetch -q origin main');
  });

  it('reads a string pull number as the MCP gives it', () => {
    const { world } = createWorld(HAPPY);
    expect(noticeOf(mergeDeploysProd.run(mergeCall({ pullNumber: '412' }), world))).toBe(
      writeNotice('412', 'pragma', SHARED_OWED, 'green'),
    );
  });

  it('reads the pull request of a gh pr merge run from Bash, with gh filling owner and repository', () => {
    const { world, calls } = createWorld(HAPPY);
    expect(noticeOf(mergeDeploysProd.run(bash('cd x && gh pr merge 412 --squash'), world))).toBe(
      writeNotice(
        '412',
        'unknown — the head commit of pull request 412 could not be read',
        'unknown from this checkout',
        HEAD_UNREADABLE,
      ),
    );
    expect(calls).toContain('gh api repos/{owner}/{repo}/pulls/412 --jq .head.sha');
  });

  it('takes the leading digits of the first numbered gh pr merge', () => {
    const { world, calls } = createWorld({ 'sh -c command -v gh': ok() });
    mergeDeploysProd.run(bash('gh pr merge; gh pr merge --auto; gh pr merge 77x'), world);
    expect(calls).toContain('gh api repos/{owner}/{repo}/pulls/77 --jq .head.sha');
  });

  it('compares the checkout HEAD for a merge of the current branch', () => {
    const { world } = createWorld({
      ...HAPPY,
      'git diff --name-only origin/main...HEAD': ok('apps/talos/a.ts\n'),
      '/repository/node_modules/.bin/tsx /repository/scripts/pr/deploy-fanout.ts origin/main HEAD':
        ok('talos\n'),
    });
    expect(noticeOf(mergeDeploysProd.run(bash('gh pr merge --squash'), world))).toBe(
      writeNotice(
        'the current branch',
        'talos',
        'no — the committed borso-shared template is unchanged in this diff',
        HEAD_UNREADABLE,
      ),
    );
  });

  it.each(['echo "gh pr merge 5"', 'cat <<EOF\ngh pr merge 5\nEOF', 'gh pr view 5', 'gh', ''])(
    'lets %j through silently, because it merges nothing',
    (command) => {
      const { world, calls } = createWorld(HAPPY);
      expect(mergeDeploysProd.run(bash(command), world)).toEqual({ kind: 'pass' });
      expect(calls).toEqual([]);
    },
  );

  it('lets a call with neither a pull number nor a command through', () => {
    const { world } = createWorld(HAPPY);
    expect(mergeDeploysProd.run(mergeCall({ pullNumber: '' }), world).kind).toBe('pass');
  });

  it('says unknown, never none, when the pull request head cannot be read', () => {
    const { world } = createWorld({
      ...HAPPY,
      'gh api repos/hugoleborso/borso.fr/pulls/412 --jq .head.sha': FAILED,
    });
    expect(noticeOf(mergeDeploysProd.run(mergeCall(), world))).toBe(
      writeNotice(
        '412',
        'unknown — the head commit of pull request 412 could not be read',
        'unknown from this checkout',
        HEAD_UNREADABLE,
      ),
    );
  });

  it('fetches the pull request head when the checkout does not have it', () => {
    const { world } = createWorld({
      ...HAPPY,
      [`git cat-file -e ${SHA}^{commit}`]: FAILED,
      'git fetch -q origin pull/412/head': ok(),
    });
    expect(noticeOf(mergeDeploysProd.run(mergeCall(), world))).toContain('deploys: pragma');
  });

  it('says unknown when the head can be neither found nor fetched', () => {
    const { world } = createWorld({ ...HAPPY, [`git cat-file -e ${SHA}^{commit}`]: FAILED });
    expect(noticeOf(mergeDeploysProd.run(mergeCall(), world))).toContain(
      'deploys: unknown — the head commit of pull request 412 could not be read',
    );
  });

  it('compares HEAD when gh is not installed, as the old hook did', () => {
    const { world } = createWorld({
      'git diff --name-only origin/main...HEAD': ok(`${SNAPSHOT}\n`),
      '/repository/node_modules/.bin/tsx /repository/scripts/pr/deploy-fanout.ts origin/main HEAD':
        ok(''),
    });
    expect(noticeOf(mergeDeploysProd.run(mergeCall(), world))).toBe(
      writeNotice('412', '', SHARED_OWED, HEAD_UNREADABLE),
    );
  });

  it('says the fan-out did not run when tsx or the script is missing', () => {
    const { world } = createWorld(HAPPY, new Set(['scripts/pr/deploy-fanout.ts']));
    expect(noticeOf(mergeDeploysProd.run(mergeCall(), world))).toContain(
      'deploys: unknown — scripts/pr/deploy-fanout.ts did not run in this checkout',
    );
    const missingScript = createWorld(HAPPY, new Set(['node_modules/.bin/tsx']));
    expect(noticeOf(mergeDeploysProd.run(mergeCall(), missingScript.world))).toContain(
      'did not run in this checkout',
    );
  });

  it('says the fan-out failed when it exits non-zero', () => {
    const { world } = createWorld({
      ...HAPPY,
      [`/repository/node_modules/.bin/tsx /repository/scripts/pr/deploy-fanout.ts origin/main ${SHA}`]:
        FAILED,
    });
    expect(noticeOf(mergeDeploysProd.run(mergeCall(), world))).toContain(
      "deploys: unknown from this checkout — read the pull request's Files changed tab",
    );
  });

  it('refuses a merge whose checks are not green, because main has no branch rule', () => {
    const { world } = createWorld({
      ...HAPPY,
      [`${CHECK_RUNS} ${CHECK_RUNS_JQ}`]: ok(
        'build\tcompleted\tfailure\ne2e\tin_progress\t\ndocs\tcompleted\tneutral\n',
      ),
    });
    expect(mergeDeploysProd.run(mergeCall(), world)).toEqual({
      kind: 'refuse',
      rule: 'merge-on-red',
      summary: 'tried to merge a pull request whose checks were not green',
      lines: [
        '[merge-on-red] refused: pull request 412 has checks that are not green on its head:',
        '    build: failure',
        '    e2e: in_progress',
        '[merge-on-red] Fix a failure, or wait for the check_suite event of a running one, then merge.',
      ],
    });
  });

  it('refuses a head with no check run yet, and says so', () => {
    const { world } = createWorld({ ...HAPPY, [`${CHECK_RUNS} ${CHECK_RUNS_JQ}`]: ok('') });
    const verdict = mergeDeploysProd.run(mergeCall(), world);
    expect(verdict.kind === 'refuse' ? verdict.lines[1] : '').toBe(
      '    no check has run on this head yet',
    );
  });

  it('refuses a check run line it cannot split, naming it with no outcome', () => {
    const { world } = createWorld({ ...HAPPY, [`${CHECK_RUNS} ${CHECK_RUNS_JQ}`]: ok('lint\n') });
    const verdict = mergeDeploysProd.run(mergeCall(), world);
    expect(verdict.kind === 'refuse' ? verdict.lines[1] : '').toBe('    lint: ');
  });

  it('lets the merge through with unknown checks when the check runs cannot be read', () => {
    const { world } = createWorld({ ...HAPPY, [`${CHECK_RUNS} ${CHECK_RUNS_JQ}`]: FAILED });
    expect(noticeOf(mergeDeploysProd.run(mergeCall(), world))).toContain(
      `Checks on the head:              ${HEAD_UNREADABLE}`,
    );
  });

  const MOVED: Record<string, CommandResult> = {
    ...HAPPY,
    [`${CHECK_RUNS} ${CI_START_JQ}`]: ok('2026-11-26T10:00:00Z\n'),
    'git log --first-parent --since=2026-11-26T10:00:00Z --format=%H origin/main': ok(
      'seen\nself\nnew1\nnew2\n',
    ),
    [`git merge-base --is-ancestor seen ${SHA}`]: ok(),
    'git log -1 --format=%s self': ok('feat: this one (#412)\n'),
    'git log -1 --format=%s new1': ok('feat: other (#411)\n'),
    'git log -1 --format=%s new2': ok('docs: other (#410)\n'),
    'git log --no-walk=unsorted --format=    %h %s new1 new2': ok(
      '    new1 feat: other (#411)\n    new2 docs: other (#410)\n',
    ),
    'git diff-tree --no-commit-id --name-only -r -m --first-parent new1': ok('apps/pragma/a.ts\n'),
    'git diff-tree --no-commit-id --name-only -r -m --first-parent new2': ok(`${SNAPSHOT}\n`),
  };

  it('refuses a merge beside base commits that change the same files, because no CI run tested them together', () => {
    const { world } = createWorld(MOVED);
    expect(mergeDeploysProd.run(mergeCall(), world)).toEqual({
      kind: 'refuse',
      rule: 'merge-on-moved-base',
      summary: 'tried to merge a pull request beside base commits no CI run tested with it',
      lines: [
        "[merge-on-moved-base] refused: main moved after this pull request's CI started (2026-11-26T10:00:00Z),",
        '[merge-on-moved-base] and these commits change files this branch also changes:',
        '    new1 feat: other (#411)',
        '    new2 docs: other (#410)',
        '[merge-on-moved-base] Files both sides changed:',
        '    apps/pragma/a.ts',
        `    ${SNAPSHOT}`,
        '[merge-on-moved-base] Merge main into the branch, push, wait for the check_suite event, then merge.',
      ],
    });
  });

  it('lets a merge beside untested base commits through when no file changed on both sides, and says so', () => {
    const { world } = createWorld({
      ...MOVED,
      'git diff-tree --no-commit-id --name-only -r -m --first-parent new1': ok('apps/talos/b.ts\n'),
      'git diff-tree --no-commit-id --name-only -r -m --first-parent new2': ok(''),
    });
    expect(noticeOf(mergeDeploysProd.run(mergeCall(), world))).toBe(
      writeNotice(
        '412',
        'pragma',
        SHARED_OWED,
        'green',
        `
[merge-on-moved-base] main moved after this pull request's CI started (2026-11-26T10:00:00Z).
These merged since, and no run tested them beside this branch:
    new1 feat: other (#411)
    new2 docs: other (#410)
No file changed on both sides, so the merge was let through. It has already
run by the time you read this. Tell the operator once, and read main's
own CI run, which is the first test of the combination.`,
      ),
    );
  });

  it('adds nothing when every base commit since CI started is already in the branch or is this one', () => {
    const { world } = createWorld({
      ...MOVED,
      'git log --first-parent --since=2026-11-26T10:00:00Z --format=%H origin/main':
        ok('seen\nself\n'),
    });
    expect(noticeOf(mergeDeploysProd.run(mergeCall(), world))).toBe(
      writeNotice('412', 'pragma', SHARED_OWED, 'green'),
    );
  });

  it('adds nothing when the CI start cannot be read', () => {
    const { world } = createWorld({ ...MOVED, [`${CHECK_RUNS} ${CI_START_JQ}`]: FAILED });
    expect(noticeOf(mergeDeploysProd.run(mergeCall(), world))).toBe(
      writeNotice('412', 'pragma', SHARED_OWED, 'green'),
    );
  });
});
