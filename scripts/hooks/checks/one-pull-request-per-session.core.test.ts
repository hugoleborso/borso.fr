import { describe, expect, it } from 'vitest';
import type { CommandResult, HookInput, HookWorld } from '../check.core.ts';
import { onePullRequestPerSession } from './one-pull-request-per-session.core.ts';

interface FakeWorld {
  readonly sessionId?: string;
  readonly openPullRequests?: CommandResult;
}

function createWorld({ sessionId, openPullRequests }: FakeWorld): {
  world: HookWorld;
  calls: string[][];
} {
  const calls: string[][] = [];
  const world: HookWorld = {
    projectDirectory: '/repository',
    readEnvironment: (name) => (name === 'CLAUDE_CODE_REMOTE_SESSION_ID' ? sessionId : undefined),
    readText: () => null,
    run: (command, args) => {
      calls.push([command, ...args]);
      return openPullRequests ?? { status: 0, stdout: '', stderr: '' };
    },
  };
  return { world, calls };
}

function createPullRequest(fields: Record<string, unknown>): HookInput {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: 'mcp__github__create_pull_request',
    tool_input: { owner: 'hugoleborso', repo: 'borso.fr', ...fields },
  };
}

const TWO_OPEN = { status: 0, stdout: '412\tclaude/hooks\n413\tclaude/other\n', stderr: '' };

// @FollowsBlueprint test-pure-unit
describe('onePullRequestPerSession', () => {
  it('fires only on create_pull_request', () => {
    expect(onePullRequestPerSession.tools?.test('mcp__github__create_pull_request')).toBe(true);
    expect(onePullRequestPerSession.tools?.test('Bash')).toBe(false);
  });

  it('refuses a stacked pull request, because a feature is one branch the operator reviews on one preview', () => {
    const { world } = createWorld({});
    expect(onePullRequestPerSession.run(createPullRequest({ base: 'claude/a' }), world)).toEqual({
      kind: 'refuse',
      rule: 'one-pull-request-per-session',
      summary: 'opened a pull request stacked on a branch other than main',
      lines: [
        '[one-pull-request] the base is `claude/a`, not `main`: this is a stacked pull request.',
        '[one-pull-request] A feature is one branch and one pull request. Push these commits to the branch of the open pull request, or base this one on `main`.',
      ],
    });
  });

  it('fails open without an owner and repository, or without a session id', () => {
    const { world, calls } = createWorld({});
    expect(onePullRequestPerSession.run(createPullRequest({ owner: 7 }), world).kind).toBe('pass');
    expect(onePullRequestPerSession.run(createPullRequest({ base: 'main' }), world).kind).toBe(
      'pass',
    );
    expect(calls).toEqual([]);
  });

  it('reads the open pull requests whose body carries this session, with the cse_ prefix dropped', () => {
    const { world, calls } = createWorld({ sessionId: 'cse_abc' });
    expect(onePullRequestPerSession.run(createPullRequest({}), world).kind).toBe('pass');
    expect(calls).toEqual([
      [
        'gh',
        'api',
        'repos/hugoleborso/borso.fr/pulls?state=open&per_page=100',
        '--jq',
        '.[] | select((.body // "") | contains("session_abc")) | "\\(.number)\\t\\(.head.ref)"',
      ],
    ]);
  });

  it('keeps a session id that has no cse_ prefix', () => {
    const { world, calls } = createWorld({ sessionId: 'abc' });
    onePullRequestPerSession.run(createPullRequest({}), world);
    expect(calls[0]?.[4]).toContain('contains("session_abc")');
  });

  it('refuses a second pull request from a session that has one open, naming each undeclared one', () => {
    const { world } = createWorld({ sessionId: 'abc', openPullRequests: TWO_OPEN });
    expect(
      onePullRequestPerSession.run(
        createPullRequest({ body: 'Independent of #413: other app.' }),
        world,
      ),
    ).toEqual({
      kind: 'refuse',
      rule: 'one-pull-request-per-session',
      summary: 'opened a second pull request while the session already had one open',
      lines: [
        '[one-pull-request] this session already has a pull request open:',
        '  #412 on `claude/hooks`',
        '[one-pull-request] Keep working in it: push the new commits to its branch and update its body. One preview, one merge.',
        '[one-pull-request] If the new work shares no file and no behaviour with it, say so in the new body as `Independent of #<number>: <reason>`.',
      ],
    });
  });

  it('names an open pull request whose line carries no branch', () => {
    const { world } = createWorld({
      sessionId: 'abc',
      openPullRequests: { status: 0, stdout: '412\n', stderr: '' },
    });
    const verdict = onePullRequestPerSession.run(createPullRequest({}), world);
    expect(verdict.kind === 'refuse' ? verdict.lines[1] : null).toBe('  #412 on ``');
  });

  it('lets the pull request through when each open one is declared independent', () => {
    const { world } = createWorld({ sessionId: 'abc', openPullRequests: TWO_OPEN });
    const body = 'Independent of #412: a. Independent of #413: b.';
    expect(onePullRequestPerSession.run(createPullRequest({ body }), world).kind).toBe('pass');
  });

  it('does not read #4120 as a declaration for #412', () => {
    const { world } = createWorld({
      sessionId: 'abc',
      openPullRequests: { status: 0, stdout: '412\tclaude/hooks\n', stderr: '' },
    });
    const body = 'Independent of #4120: a.';
    expect(onePullRequestPerSession.run(createPullRequest({ body }), world).kind).toBe('refuse');
  });

  it('fails open when GitHub does not answer', () => {
    const { world } = createWorld({
      sessionId: 'abc',
      openPullRequests: { status: 1, stdout: '412\tclaude/hooks\n', stderr: 'HTTP 403' },
    });
    expect(onePullRequestPerSession.run(createPullRequest({}), world).kind).toBe('pass');
  });
});
