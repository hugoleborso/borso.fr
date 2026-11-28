// @FollowsBlueprint utils-pure-module
import { type Check, type HookInput, type HookWorld, PASS, type Verdict } from '../check.core.ts';
import { listSimpleCommands } from '../shell-command.core.ts';

const BASE_BRANCH = 'main';
const SHARED_SNAPSHOT = 'infra/shared/test/unit/__snapshots__/borso-shared.template.json';
const FANOUT = 'scripts/pr/deploy-fanout.ts';
const TSX = 'node_modules/.bin/tsx';
const CANDIDATES_ONLY = '--candidates-only';
const CURRENT_BRANCH = 'the current branch';
const GREEN_CONCLUSIONS = new Set(['success', 'skipped', 'neutral']);
const LEADING_NUMBER = /^[0-9]+/u;
const NUMBERED = /^[0-9]+$/u;

interface Merge {
  readonly world: HookWorld;
  readonly pullRequest: string;
  readonly owner: string;
  readonly repository: string;
  readonly isNumbered: boolean;
  readonly hasGh: boolean;
}

type ToolInput = NonNullable<HookInput['tool_input']>;

function readString(toolInput: ToolInput, field: string, fallback: string): string {
  const value = toolInput[field];
  return typeof value === 'string' ? value : fallback;
}

function readOutput(world: HookWorld, command: string, args: readonly string[]): string {
  return world.run(command, args).stdout.replace(/\n+$/u, '');
}

function listLines(output: string): string[] {
  return output === '' ? [] : output.split('\n');
}

function findBashMerge(command: string): string | null {
  const merges = listSimpleCommands(command).filter(
    (simple) => simple.name === 'gh' && simple.args[0] === 'pr' && simple.args[1] === 'merge',
  );
  if (merges.length === 0) return null;
  const numbers = merges.map((merge) => merge.args[2]?.match(LEADING_NUMBER)?.[0]);
  return numbers.find((number) => number !== undefined) ?? CURRENT_BRANCH;
}

function readPullRequest(toolInput: ToolInput): string | null {
  const pullNumber = toolInput['pullNumber'];
  if (typeof pullNumber === 'number') return String(pullNumber);
  if (typeof pullNumber === 'string' && pullNumber !== '') return pullNumber;
  const command = toolInput['command'];
  return typeof command === 'string' ? findBashMerge(command) : null;
}

function readComparedHead(merge: Merge): string {
  if (!merge.isNumbered || !merge.hasGh) return 'HEAD';
  const { world, owner, repository, pullRequest } = merge;
  const head = world.run('gh', [
    'api',
    `repos/${owner}/${repository}/pulls/${pullRequest}`,
    '--jq',
    '.head.sha',
  ]);
  const sha = head.status === 0 ? head.stdout.trim() : '';
  if (sha === '') return '';
  const isKnown =
    world.run('git', ['cat-file', '-e', `${sha}^{commit}`]).status === 0 ||
    world.run('git', ['fetch', '-q', 'origin', `pull/${pullRequest}/head`]).status === 0;
  return isKnown ? sha : '';
}

function describeApplications(merge: Merge, comparedHead: string): string {
  const { world } = merge;
  if (comparedHead === '') {
    return `unknown — the head commit of pull request ${merge.pullRequest} could not be read`;
  }
  if (world.readText(TSX) === null || world.readText(FANOUT) === null) {
    return 'unknown — scripts/pr/deploy-fanout.ts did not run in this checkout';
  }
  const fanout = world.run(`${world.projectDirectory}/${TSX}`, [
    `${world.projectDirectory}/${FANOUT}`,
    `origin/${BASE_BRANCH}`,
    comparedHead,
    CANDIDATES_ONLY,
  ]);
  return fanout.status === 0
    ? fanout.stdout.replace(/\n+$/u, '')
    : "unknown from this checkout — read the pull request's Files changed tab";
}

function describeShared(changed: readonly string[]): string {
  if (changed.length === 0) return 'unknown from this checkout';
  return changed.some((path) => path.includes(SHARED_SNAPSHOT))
    ? 'YES — the committed borso-shared template moved, so a shared-deploy dispatch is owed after this merge'
    : 'no — the committed borso-shared template is unchanged in this diff';
}

function describeNotGreen(checkRun: string): string | null {
  const tabIndex = checkRun.indexOf('\t');
  const name = tabIndex === -1 ? checkRun : checkRun.slice(0, tabIndex);
  const outcome = tabIndex === -1 ? [] : checkRun.slice(tabIndex + 1).split('\t');
  const status = outcome.at(0) ?? '';
  const conclusion = outcome.at(1) ?? '';
  if (status === 'completed' && GREEN_CONCLUSIONS.has(conclusion)) return null;
  return `    ${name}: ${status === 'completed' ? conclusion : status}`;
}

function isLine(line: string | null): line is string {
  return line !== null;
}

function judgeChecks(merge: Merge, comparedHead: string): Verdict | string {
  const unknown = 'unknown — the check runs of this head could not be read';
  if (!merge.isNumbered || comparedHead === '' || !merge.hasGh) return unknown;
  const checkRuns = merge.world.run('gh', [
    'api',
    `repos/${merge.owner}/${merge.repository}/commits/${comparedHead}/check-runs?per_page=100`,
    '--jq',
    '.check_runs[] | "\\(.name)\\t\\(.status)\\t\\(.conclusion // "")"',
  ]);
  if (checkRuns.status !== 0) return unknown;
  const runs = checkRuns.stdout.replace(/\n+$/u, '');
  const notGreen =
    runs === ''
      ? ['    no check has run on this head yet']
      : runs.split('\n').map(describeNotGreen).filter(isLine);
  if (notGreen.length === 0) return 'green';
  return {
    kind: 'refuse',
    rule: 'merge-on-red',
    summary: 'tried to merge a pull request whose checks were not green',
    lines: [
      `[merge-on-red] refused: pull request ${merge.pullRequest} has checks that are not green on its head:`,
      ...notGreen,
      '[merge-on-red] Fix a failure, or wait for the check_suite event of a running one, then merge.',
    ],
  };
}

function readCiStart(merge: Merge, comparedHead: string): string {
  const started = merge.world.run('gh', [
    'api',
    `repos/${merge.owner}/${merge.repository}/commits/${comparedHead}/check-runs?per_page=100`,
    '--jq',
    '[.check_runs[] | select(.app.slug == "github-actions") | .started_at] | min // empty',
  ]);
  return started.status === 0 ? started.stdout.trim() : '';
}

function listUnseenCommits(merge: Merge, comparedHead: string, ciStarted: string): string[] {
  const { world } = merge;
  const commits = listLines(
    readOutput(world, 'git', [
      'log',
      '--first-parent',
      `--since=${ciStarted}`,
      '--format=%H',
      `origin/${BASE_BRANCH}`,
    ]),
  );
  return commits.filter(
    (commit) =>
      world.run('git', ['merge-base', '--is-ancestor', commit, comparedHead]).status !== 0 &&
      !readOutput(world, 'git', ['log', '-1', '--format=%s', commit]).includes(
        `(#${merge.pullRequest})`,
      ),
  );
}

function listFilesBothSidesChanged(
  world: HookWorld,
  unseen: readonly string[],
  changed: readonly string[],
): string[] {
  const baseFiles = new Set(
    unseen.flatMap((commit) =>
      listLines(
        readOutput(world, 'git', [
          'diff-tree',
          '--no-commit-id',
          '--name-only',
          '-r',
          '-m',
          '--first-parent',
          commit,
        ]),
      ),
    ),
  );
  return [...new Set(changed)].filter((path) => baseFiles.has(path)).toSorted();
}

function judgeMovedBase(
  merge: Merge,
  comparedHead: string,
  changed: readonly string[],
): Verdict | string {
  if (!merge.isNumbered || comparedHead === '' || !merge.hasGh) return '';
  const ciStarted = readCiStart(merge, comparedHead);
  if (ciStarted === '') return '';
  const unseen = listUnseenCommits(merge, comparedHead, ciStarted);
  if (unseen.length === 0) return '';
  const subjects = readOutput(merge.world, 'git', [
    'log',
    '--no-walk=unsorted',
    '--format=    %h %s',
    ...unseen,
  ]);
  const both = listFilesBothSidesChanged(merge.world, unseen, changed);
  if (both.length === 0) {
    return `
[merge-on-moved-base] ${BASE_BRANCH} moved after this pull request's CI started (${ciStarted}).
These merged since, and no run tested them beside this branch:
${subjects}
No file changed on both sides, so the merge was let through. It has already
run by the time you read this. Tell the operator once, and read ${BASE_BRANCH}'s
own CI run, which is the first test of the combination.`;
  }
  return {
    kind: 'refuse',
    rule: 'merge-on-moved-base',
    summary: 'tried to merge a pull request beside base commits no CI run tested with it',
    lines: [
      `[merge-on-moved-base] refused: ${BASE_BRANCH} moved after this pull request's CI started (${ciStarted}),`,
      '[merge-on-moved-base] and these commits change files this branch also changes:',
      ...subjects.split('\n'),
      '[merge-on-moved-base] Files both sides changed:',
      ...both.map((path) => `    ${path}`),
      `[merge-on-moved-base] Merge ${BASE_BRANCH} into the branch, push, wait for the check_suite event, then merge.`,
    ],
  };
}

function writeNotice(
  pullRequest: string,
  applications: string,
  shared: string,
  checks: string,
  movedBase: string,
): string {
  return `[merge-deploys-prod] merging pull request ${pullRequest} into ${BASE_BRANCH} deploys to production.

There is no approval step after this call. Pushing to ${BASE_BRANCH} runs
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

export const mergeDeploysProd: Check = {
  name: 'merge-deploys-prod',
  tools: /^(mcp__github__merge_pull_request|Bash)$/u,
  run(input, world): Verdict {
    const toolInput = input.tool_input ?? {};
    const pullRequest = readPullRequest(toolInput);
    if (pullRequest === null) return PASS;
    const merge: Merge = {
      world,
      pullRequest,
      owner: readString(toolInput, 'owner', '{owner}'),
      repository: readString(toolInput, 'repo', '{repo}'),
      isNumbered: NUMBERED.test(pullRequest),
      hasGh: world.run('sh', ['-c', 'command -v gh']).status === 0,
    };
    world.run('git', ['fetch', '-q', 'origin', BASE_BRANCH]);
    const comparedHead = readComparedHead(merge);
    const applications = describeApplications(merge, comparedHead);
    const changed =
      comparedHead === ''
        ? []
        : listLines(
            readOutput(world, 'git', [
              'diff',
              '--name-only',
              `origin/${BASE_BRANCH}...${comparedHead}`,
            ]),
          );
    const checks = judgeChecks(merge, comparedHead);
    if (typeof checks !== 'string') return checks;
    const movedBase = judgeMovedBase(merge, comparedHead, changed);
    if (typeof movedBase !== 'string') return movedBase;
    return {
      kind: 'context',
      text: writeNotice(pullRequest, applications, describeShared(changed), checks, movedBase),
    };
  },
};
