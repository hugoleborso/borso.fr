import { describe, expect, it } from 'vitest';
import type { HookInput, HookWorld } from '../check.core.ts';
import { subagentNoStaging } from './subagent-no-staging.core.ts';

const SHARED_GIT_DIRECTORY = '/repository/.git';

function createWorld(
  directories: readonly string[],
  gitDirectories: Record<string, string>,
): { world: HookWorld; calls: string[] } {
  const calls: string[] = [];
  const world: HookWorld = {
    projectDirectory: '/repository',
    readEnvironment: () => undefined,
    readText: () => null,
    run: (command, args) => {
      calls.push([command, ...args].join(' '));
      if (command === 'test') {
        return { status: directories.includes(args[1] ?? '') ? 0 : 1, stdout: '', stderr: '' };
      }
      const directory = args[1] ?? '';
      if (args.at(-1) === '--git-common-dir' && directory === '/repository') {
        return { status: 0, stdout: `${SHARED_GIT_DIRECTORY}\n`, stderr: '' };
      }
      const gitDirectory = gitDirectories[directory];
      if (gitDirectory === undefined) return { status: 128, stdout: '', stderr: 'fatal' };
      return { status: 0, stdout: `${gitDirectory}\n`, stderr: '' };
    },
  };
  return { world, calls };
}

const SHARED = createWorld(['/repository', '/repository/apps', '/w'], {
  '/repository': SHARED_GIT_DIRECTORY,
  '/repository/apps': SHARED_GIT_DIRECTORY,
  '/w': '/repository/.git/worktrees/w',
});

function bash(command: unknown, agentId: string | undefined = 'agent-1'): HookInput {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command },
    cwd: '/repository',
    agent_id: agentId,
  };
}

function judge(command: unknown): string {
  return subagentNoStaging.run(bash(command), SHARED.world).kind;
}

// @FollowsBlueprint test-pure-unit
describe('subagentNoStaging', () => {
  it('fires only on Bash', () => {
    expect(subagentNoStaging.tools?.test('Bash')).toBe(true);
    expect(subagentNoStaging.tools?.test('Edit')).toBe(false);
  });

  it('refuses a subagent writing the shared index, because the main session commits whatever is staged', () => {
    const { world, calls } = createWorld(['/repository'], { '/repository': SHARED_GIT_DIRECTORY });
    expect(subagentNoStaging.run(bash('git mv a b'), world)).toEqual({
      kind: 'refuse',
      rule: 'subagent-no-staging',
      summary: 'a subagent ran a git command that writes the shared index',
      lines: [
        "[subagent-no-staging] A subagent shares this checkout's index with every other agent, and the main session commits.",
        '[subagent-no-staging] Change the working tree only, and name the paths in your report:',
        '[subagent-no-staging]   git mv a b  ->  mv a b       git rm a  ->  rm a       git add, git commit  ->  nothing',
      ],
    });
    expect(calls).toEqual([
      'git -C /repository rev-parse --path-format=absolute --git-common-dir',
      'test -d /repository',
      'git -C /repository rev-parse --path-format=absolute --git-dir',
    ]);
  });

  it.each([
    'git add a.ts',
    'ls && git rm a',
    'if true; then git commit -m x; fi',
    '(git add .)',
    'cd apps && git add x',
    'git -C /repository add x',
    'echo git add -h; git add x',
    'git add x && cd /w',
    'cd /repository\ngit add x',
  ])('refuses %j in the shared checkout', (command) => {
    expect(judge(command)).toBe('refuse');
  });

  it('lets the main session stage, since it is the one that commits', () => {
    expect(subagentNoStaging.run(bash('git add a', ''), SHARED.world).kind).toBe('pass');
  });

  it.each([
    'git mv -h',
    'git add --help | cat',
    'git status && git diff',
    'echo "git add a"',
    'cat <<EOF\ngit add a\nEOF',
    '',
  ])('lets %j through, because it writes no index', (command) => {
    expect(judge(command)).toBe('pass');
  });

  it('lets a call with no command through', () => {
    expect(judge(undefined)).toBe('pass');
    const input: HookInput = { hook_event_name: 'PreToolUse', tool_name: 'Bash', agent_id: 'a' };
    expect(subagentNoStaging.run(input, SHARED.world).kind).toBe('pass');
  });

  it.each([
    'cd /w && git add x',
    'cd  /w && git add x',
    'git -C /w add x',
    'cd /w; cd sub-not-there && git add x',
  ])('lets %j through, because a linked worktree has its own index', (command) => {
    expect(judge(command)).toBe('pass');
  });

  it('walks up from a directory the command creates to its nearest existing ancestor', () => {
    const { world, calls } = createWorld(['/w'], { '/w': '/repository/.git/worktrees/w' });
    expect(subagentNoStaging.run(bash('cd /w/new/dir && git add x'), world).kind).toBe('pass');
    expect(calls.filter((call) => call.startsWith('test'))).toEqual([
      'test -d /w/new/dir',
      'test -d /w/new',
      'test -d /w',
    ]);
  });

  it('stops walking at the root, where the git directory cannot be read', () => {
    const { world, calls } = createWorld([], {});
    expect(subagentNoStaging.run(bash('cd /gone && git add x'), world).kind).toBe('pass');
    expect(calls.at(-1)).toBe('git -C / rev-parse --path-format=absolute --git-dir');
  });

  it('compares the two git directories without their trailing newline', () => {
    const world: HookWorld = {
      ...SHARED.world,
      run: (_command, args) => ({
        status: 0,
        stdout: args.at(-1) === '--git-dir' ? `${SHARED_GIT_DIRECTORY}\n` : SHARED_GIT_DIRECTORY,
        stderr: '',
      }),
    };
    expect(subagentNoStaging.run(bash('git add x'), world).kind).toBe('refuse');
  });

  it('ignores what a failing git prints, even when both answers match', () => {
    const world: HookWorld = {
      ...SHARED.world,
      run: (command) => ({ status: command === 'test' ? 0 : 128, stdout: 'fatal\n', stderr: '' }),
    };
    expect(subagentNoStaging.run(bash('git add x'), world).kind).toBe('pass');
  });

  it('starts from the project directory when the input carries no cwd', () => {
    const input = { ...bash('git add x'), cwd: undefined };
    expect(subagentNoStaging.run(input, SHARED.world).kind).toBe('refuse');
  });

  it('resolves a relative git -C against the cwd', () => {
    const input = { ...bash('git -C apps add x'), cwd: '/repository' };
    expect(subagentNoStaging.run(input, SHARED.world).kind).toBe('refuse');
  });
});
