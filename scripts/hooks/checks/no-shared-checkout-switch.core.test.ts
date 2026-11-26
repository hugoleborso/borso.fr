import { describe, expect, it } from 'vitest';
import type { HookInput, HookWorld } from '../check.core.ts';
import { noSharedCheckoutSwitch } from './no-shared-checkout-switch.core.ts';

interface FakeCheckout {
  readonly gitDirectory: string;
  readonly commonDirectory: string;
}

function createWorld(
  checkouts: Record<string, FakeCheckout>,
  remote?: string,
): { world: HookWorld; calls: string[] } {
  const calls: string[] = [];
  const world: HookWorld = {
    projectDirectory: '/repository',
    readEnvironment: (name) => (name === 'CLAUDE_CODE_REMOTE' ? remote : undefined),
    readText: () => null,
    run: (command, args) => {
      calls.push([command, ...args].join(' '));
      const target = args.at(-4) ?? '';
      const checkout = checkouts[target];
      if (checkout === undefined)
        return { status: 128, stdout: '', stderr: 'not a git repository' };
      const path = args.at(-1) === '--git-dir' ? checkout.gitDirectory : checkout.commonDirectory;
      return { status: 0, stdout: `${path}\n`, stderr: '' };
    },
  };
  return { world, calls };
}

const MAIN = { gitDirectory: '/repository/.git', commonDirectory: '/repository/.git' };
const WORKTREE = {
  gitDirectory: '/repository/.git/worktrees/a',
  commonDirectory: '/repository/.git',
};

function bash(command: unknown, cwd = '/repository'): HookInput {
  return { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command }, cwd };
}

// @FollowsBlueprint test-pure-unit
describe('noSharedCheckoutSwitch', () => {
  it('fires only on Bash', () => {
    expect(noSharedCheckoutSwitch.tools?.test('Bash')).toBe(true);
    expect(noSharedCheckoutSwitch.tools?.test('Read')).toBe(false);
  });

  it('refuses a switch in the main checkout, because it moves the HEAD every local session shares', () => {
    const { world, calls } = createWorld({ '/repository': MAIN });
    expect(noSharedCheckoutSwitch.run(bash('git switch feature'), world)).toEqual({
      kind: 'refuse',
      rule: 'no-shared-checkout-switch',
      summary: 'switched branches in the main checkout other local sessions share',
      lines: [
        '[no-shared-checkout-switch] /repository is the main checkout, and other local sessions work in it too.',
        '[no-shared-checkout-switch] A branch switch here moves their HEAD, and their next commit lands on your branch.',
        '[no-shared-checkout-switch] Work on a branch in a worktree of your own:',
        '[no-shared-checkout-switch]   git worktree add <scratchpad>/<label> -b <branch> origin/main',
        "[no-shared-checkout-switch] To discard a file's changes, use git restore <file>, which leaves the branch alone.",
      ],
    });
    expect(calls).toEqual([
      'git -C /repository -C /repository rev-parse --path-format=absolute --git-dir',
      'git -C /repository -C /repository rev-parse --path-format=absolute --git-common-dir',
    ]);
  });

  it('lets a switch in a linked worktree through, because it has its own HEAD', () => {
    const { world } = createWorld({ '/repository': MAIN, '/w': WORKTREE });
    expect(noSharedCheckoutSwitch.run(bash('git checkout main', '/w'), world).kind).toBe('pass');
  });

  it('judges the directory of a leading cd, and a git -C over it', () => {
    const { world } = createWorld({ '/repository': MAIN, '/w': WORKTREE });
    expect(
      noSharedCheckoutSwitch.run(bash('cd /repository && git switch b', '/w'), world).kind,
    ).toBe('refuse');
    expect(
      noSharedCheckoutSwitch.run(bash('cd /repository && git -C /w checkout b', '/w'), world).kind,
    ).toBe('pass');
  });

  it('falls back to the project directory when the input carries no cwd', () => {
    const { world, calls } = createWorld({ '/repository': MAIN });
    expect(
      noSharedCheckoutSwitch.run({ ...bash('git switch b'), cwd: undefined }, world).kind,
    ).toBe('refuse');
    expect(calls[0]).toBe('git -C /repository rev-parse --path-format=absolute --git-dir');
  });

  it.each(['git checkout -- a.ts', 'git checkout -p', 'git checkout --patch a.ts'])(
    'lets the path restore %j through, because it keeps the branch',
    (command) => {
      const { world } = createWorld({ '/repository': MAIN });
      expect(noSharedCheckoutSwitch.run(bash(command), world).kind).toBe('pass');
    },
  );

  it.each(['echo "git switch b"', 'git status', 'cat <<EOF\ngit switch b\nEOF', ''])(
    'lets %j through, because it switches nothing',
    (command) => {
      const { world } = createWorld({ '/repository': MAIN });
      expect(noSharedCheckoutSwitch.run(bash(command), world).kind).toBe('pass');
    },
  );

  it('lets a call with no command through', () => {
    const { world } = createWorld({ '/repository': MAIN });
    expect(noSharedCheckoutSwitch.run(bash(undefined), world).kind).toBe('pass');
    expect(
      noSharedCheckoutSwitch.run({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }, world).kind,
    ).toBe('pass');
  });

  it('finds a switch and a cd on a later line of the command', () => {
    const { world } = createWorld({ '/repository': MAIN, '/w': WORKTREE });
    expect(noSharedCheckoutSwitch.run(bash('git status\ngit switch b'), world).kind).toBe('refuse');
    expect(
      noSharedCheckoutSwitch.run(bash('git status\ncd /repository && git switch b', '/w'), world)
        .kind,
    ).toBe('refuse');
  });

  it('compares the two git directories without their trailing newline', () => {
    const world: HookWorld = {
      ...createWorld({}).world,
      run: (_command, args) => ({
        status: 0,
        stdout: args.at(-1) === '--git-dir' ? '/repository/.git\n' : '/repository/.git',
        stderr: '',
      }),
    };
    expect(noSharedCheckoutSwitch.run(bash('git switch b'), world).kind).toBe('refuse');
  });

  it('ignores what a failing git prints, even when both answers match', () => {
    const world: HookWorld = {
      ...createWorld({}).world,
      run: () => ({ status: 128, stdout: '/repository/.git\n', stderr: 'fatal' }),
    };
    expect(noSharedCheckoutSwitch.run(bash('git switch b'), world).kind).toBe('pass');
  });

  it('lets a switch through where the target is no git checkout', () => {
    const { world } = createWorld({});
    expect(noSharedCheckoutSwitch.run(bash('git switch b'), world).kind).toBe('pass');
  });

  it('lets every switch through in a hosted session, which owns its container', () => {
    const { world, calls } = createWorld({ '/repository': MAIN }, 'true');
    expect(noSharedCheckoutSwitch.run(bash('git switch b'), world).kind).toBe('pass');
    expect(calls).toEqual([]);
  });
});
