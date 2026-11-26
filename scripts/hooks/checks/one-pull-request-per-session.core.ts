// @FollowsBlueprint utils-pure-module
import { type Check, type HookInput, type HookWorld, PASS, type Verdict } from '../check.core.ts';

const RULE = 'one-pull-request-per-session';
const TAG = '[one-pull-request]';
const SESSION_PREFIX = 'cse_';

function readField(input: HookInput, field: string): string {
  const value = input.tool_input?.[field];
  return typeof value === 'string' ? value : '';
}

function refuseAsOnePullRequest(summary: string, lines: readonly string[]): Verdict {
  return { kind: 'refuse', rule: RULE, summary, lines };
}

function readSessionId(world: HookWorld): string {
  const sessionId = world.readEnvironment('CLAUDE_CODE_REMOTE_SESSION_ID') ?? '';
  return sessionId.startsWith(SESSION_PREFIX) ? sessionId.slice(SESSION_PREFIX.length) : sessionId;
}

function listOpenPullRequests(
  world: HookWorld,
  owner: string,
  repository: string,
  sessionId: string,
): string[] {
  const result = world.run('gh', [
    'api',
    `repos/${owner}/${repository}/pulls?state=open&per_page=100`,
    '--jq',
    `.[] | select((.body // "") | contains("session_${sessionId}")) | "\\(.number)\\t\\(.head.ref)"`,
  ]);
  if (result.status !== 0) return [];
  return result.stdout.split('\n').filter((line) => line !== '');
}

function describeUndeclared(openLine: string, body: string): string | null {
  const tabIndex = openLine.indexOf('\t');
  const number = tabIndex === -1 ? openLine : openLine.slice(0, tabIndex);
  const branch = tabIndex === -1 ? '' : openLine.slice(tabIndex + 1);
  if (new RegExp(`Independent of #${number}\\b`, 'u').test(body)) return null;
  return `  #${number} on \`${branch}\``;
}

function isUndeclared(line: string | null): line is string {
  return line !== null;
}

export const onePullRequestPerSession: Check = {
  name: RULE,
  tools: /^mcp__github__create_pull_request$/u,
  run(input, world): Verdict {
    const owner = readField(input, 'owner');
    const repository = readField(input, 'repo');
    const base = readField(input, 'base');
    if (owner === '' || repository === '') return PASS;
    if (base !== '' && base !== 'main') {
      return refuseAsOnePullRequest('opened a pull request stacked on a branch other than main', [
        `${TAG} the base is \`${base}\`, not \`main\`: this is a stacked pull request.`,
        `${TAG} A feature is one branch and one pull request. Push these commits to the branch of the open pull request, or base this one on \`main\`.`,
      ]);
    }
    const sessionId = readSessionId(world);
    if (sessionId === '') return PASS;
    const body = readField(input, 'body');
    const undeclared = listOpenPullRequests(world, owner, repository, sessionId)
      .map((line) => describeUndeclared(line, body))
      .filter(isUndeclared);
    if (undeclared.length === 0) return PASS;
    return refuseAsOnePullRequest(
      'opened a second pull request while the session already had one open',
      [
        `${TAG} this session already has a pull request open:`,
        ...undeclared,
        `${TAG} Keep working in it: push the new commits to its branch and update its body. One preview, one merge.`,
        `${TAG} If the new work shares no file and no behaviour with it, say so in the new body as \`Independent of #<number>: <reason>\`.`,
      ],
    );
  },
};
