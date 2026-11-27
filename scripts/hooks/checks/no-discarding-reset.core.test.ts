import { describe, expect, it } from 'vitest';
import type { CommandResult, HookInput, HookWorld } from '../check.core.ts';
import { noDiscardingReset } from './no-discarding-reset.core.ts';

interface FakeCheckout {
  readonly changed: readonly string[];
  readonly diffStatus?: number;
}

function answer(status: number, stdout = ''): CommandResult {
  return { status, stdout, stderr: '' };
}

function answerDiff(checkout: FakeCheckout, args: readonly string[]): CommandResult {
  const separator = args.indexOf('--');
  const paths = args.slice(separator + 1);
  const changed = checkout.changed.filter((path) => paths.length === 0 || paths.includes(path));
  if (args.includes('--quiet')) return answer(checkout.diffStatus ?? (changed.length > 0 ? 1 : 0));
  return answer(0, changed.map((path) => `${path}\n`).join(''));
}

function createWorld(
  checkouts: Record<string, FakeCheckout>,
  home?: string,
): { world: HookWorld; calls: string[] } {
  const calls: string[] = [];
  const world: HookWorld = {
    projectDirectory: '/repository',
    readEnvironment: (name) => (name === 'HOME' ? home : undefined),
    readText: () => null,
    run: (command, args) => {
      calls.push([command, ...args].join(' '));
      const targetIndex = args.lastIndexOf('-C') + 1;
      const checkout = checkouts[args[targetIndex] ?? ''];
      if (checkout === undefined) return answer(128);
      if (args[targetIndex + 1] === 'rev-parse') return answer(0, 'true\n');
      return answerDiff(checkout, args);
    },
  };
  return { world, calls };
}

function bash(command: unknown): HookInput {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command },
    cwd: '/session',
  };
}

const DIRTY = createWorld({ '.': { changed: ['a.ts', 'b.ts'] }, '/w': { changed: [] } }, '/home/u');

function judge(command: unknown, world = DIRTY.world): ReturnType<typeof noDiscardingReset.run> {
  return noDiscardingReset.run(bash(command), world);
}

const UNREADABLE_TAIL = [
  '[no-discarding-reset] The hook reads the command before the shell expands it, so a variable,',
  '[no-discarding-reset] a quoted path or a directory that does not exist names no checkout it can read.',
  '[no-discarding-reset] Name the checkout with a literal path:',
  '[no-discarding-reset]   git -C /absolute/path/to/worktree reset --hard',
];

function unreadable(reason: string): ReturnType<typeof noDiscardingReset.run> {
  return {
    kind: 'refuse',
    rule: 'no-discarding-reset',
    summary: 'ran a discarding git command on a checkout the hook could not read',
    lines: [
      `[no-discarding-reset] cannot tell whether this discards uncommitted work: ${reason}.`,
      ...UNREADABLE_TAIL,
    ],
  };
}

// @FollowsBlueprint test-pure-unit
describe('noDiscardingReset', () => {
  it('fires only on Bash', () => {
    expect(noDiscardingReset.tools?.test('Bash')).toBe(true);
    expect(noDiscardingReset.tools?.test('Write')).toBe(false);
  });

  it('refuses a hard reset over tracked changes, because it deletes them with no reflog entry', () => {
    expect(judge('git reset --hard')).toEqual({
      kind: 'refuse',
      rule: 'no-discarding-reset',
      summary: 'ran `git reset --hard`, which would discard uncommitted work',
      lines: [
        '[no-discarding-reset] `git reset --hard` discards tracked changes that are not committed in .:',
        '[no-discarding-reset]     a.ts',
        '[no-discarding-reset]     b.ts',
        '[no-discarding-reset] Commit them first — a commit is cheap and amendable:',
        "[no-discarding-reset]   git add <those paths> && git commit -m 'wip'   …   git reset --soft HEAD~1",
        '[no-discarding-reset] Or park them where the command cannot reach:',
        "[no-discarding-reset]   git stash push -u -m 'before the probe'",
      ],
    });
  });

  it('runs git from the session cwd so a relative checkout resolves where the old hook ran', () => {
    const { world, calls } = createWorld({ '.': { changed: [] } });
    expect(judge('git reset --hard', world).kind).toBe('pass');
    expect(calls).toEqual([
      'git -C /session -C . rev-parse --is-inside-work-tree',
      'git -C /session -C . diff --quiet --',
    ]);
  });

  it('lists the changed paths with git diff --name-only', () => {
    const { world, calls } = createWorld({ '.': { changed: ['a.ts'] } });
    expect(judge('git restore a.ts', world).kind).toBe('refuse');
    expect(calls.at(-1)).toBe('git -C /session -C . diff --name-only -- a.ts');
  });

  it('drops every trailing newline of the changed-path list', () => {
    const world: HookWorld = {
      ...DIRTY.world,
      run: (_command, args) =>
        answer(args.includes('--quiet') ? 1 : 0, args.includes('--name-only') ? 'a.ts\n\n' : ''),
    };
    const verdict = judge('git reset --hard', world);
    expect(verdict.kind === 'refuse' ? verdict.lines.slice(1, 3) : []).toEqual([
      '[no-discarding-reset]     a.ts',
      '[no-discarding-reset] Commit them first — a commit is cheap and amendable:',
    ]);
  });

  it.each([
    ['git restore --worktree b.ts', 'b.ts'],
    ['git restore b.ts && ls', 'b.ts'],
    ['git restore  a.ts  b.ts', 'a.ts b.ts'],
  ])('names in the stash advice only the paths %j restores', (command, paths) => {
    const verdict = judge(command);
    expect(verdict.kind === 'refuse' ? verdict.lines.at(-1) : '').toBe(
      `[no-discarding-reset]   git stash push -m 'before the probe' -- ${paths}`,
    );
  });

  it('judges every discarding segment, not only the first one', () => {
    expect(judge('git -C /w reset --hard; git reset --hard').kind).toBe('refuse');
  });

  it('runs git from the project directory when the input carries no cwd', () => {
    const { world, calls } = createWorld({ '.': { changed: [] } });
    noDiscardingReset.run({ ...bash('git reset --hard'), cwd: undefined }, world);
    expect(calls[0]).toBe('git -C . rev-parse --is-inside-work-tree');
  });

  it('judges a path-scoped restore on the paths it names only, so dirty files elsewhere are not listed', () => {
    const verdict = judge('git restore --source HEAD~1 b.ts');
    expect(verdict.kind === 'refuse' ? verdict.lines : []).toEqual([
      '[no-discarding-reset] `git restore --source HEAD~1 b.ts` discards tracked changes that are not committed in .:',
      '[no-discarding-reset]     b.ts',
      '[no-discarding-reset] Commit them first — a commit is cheap and amendable:',
      "[no-discarding-reset]   git add <those paths> && git commit -m 'wip'   …   git reset --soft HEAD~1",
      '[no-discarding-reset] Or park them where the command cannot reach:',
      "[no-discarding-reset]   git stash push -m 'before the probe' -- b.ts",
    ]);
  });

  it.each([
    ['git checkout main -- a.ts', 'pass'],
    ['git checkout -- a.ts', 'refuse'],
    ['git restore checkout c.ts', 'refuse'],
    ['git restore -s HEAD c.ts', 'pass'],
    ['git restore -s a.ts c.ts', 'pass'],
    ['git restore -- -odd.ts', 'pass'],
    ['git checkout -- c.ts', 'pass'],
  ])('reads the named paths of %j, then judges it: %s', (command, kind) => {
    expect(judge(command).kind).toBe(kind);
  });

  it.each(['git restore --staged a.ts', 'git restore -S a.ts'])(
    'lets the staged-only restore %j through, because it leaves the working tree alone',
    (command) => {
      expect(judge(command).kind).toBe('pass');
    },
  );

  it('refuses a staged restore that also names the worktree', () => {
    expect(judge('git restore --staged --worktree a.ts').kind).toBe('refuse');
  });

  it.each([
    'cd /w && git reset --hard',
    'git -C /w reset --keep',
    '(cd /w; git reset --merge)',
    'cd ~/../../w && git checkout -- a.ts',
  ])('judges %j against the checkout it acts on, which is clean', (command) => {
    const { world } = createWorld(
      { '.': { changed: ['a.ts'] }, '/w': { changed: [] }, '/home/u/../../w': { changed: [] } },
      '/home/u',
    );
    expect(judge(command, world).kind).toBe('pass');
  });

  it('resolves a relative cd against the directory before it', () => {
    const { world, calls } = createWorld({ './apps': { changed: [] } });
    expect(judge('cd apps && git reset --hard', world).kind).toBe('pass');
    expect(calls[0]).toBe('git -C /session -C ./apps rev-parse --is-inside-work-tree');
  });

  it('reads a bare cd as a move to HOME', () => {
    const { world } = createWorld({ '/home/u': { changed: [] } }, '/home/u');
    expect(judge('cd && git reset --hard', world).kind).toBe('pass');
  });

  it.each([
    ['cd "$DIR" && git reset --hard', '`git reset --hard`'],
    ['cd - && git reset --hard', '`git reset --hard`'],
    ['popd; git reset --hard', '`git reset --hard`'],
    ['cd a b && git reset --hard', '`git reset --hard`'],
    ['git -C $W reset --hard', '`git -C $W reset --hard`'],
  ])('refuses %j, whose checkout only the shell can name', (command, segment) => {
    expect(judge(command)).toEqual(
      unreadable(`${segment} names its checkout through something only the shell can expand`),
    );
  });

  it('reads a bare cd with no HOME as unreadable', () => {
    const { world } = createWorld({ '.': { changed: [] } });
    expect(judge('cd; git reset --hard', world)).toEqual(
      unreadable(
        '`git reset --hard` names its checkout through something only the shell can expand',
      ),
    );
  });

  it('keeps a directory unreadable once a cd has made it so', () => {
    const { world } = createWorld({ '.': { changed: [] }, 'unreadable/apps': { changed: [] } });
    expect(judge('cd "$D" && cd apps && git reset --hard', world)).toEqual(
      unreadable(
        '`git reset --hard` names its checkout through something only the shell can expand',
      ),
    );
  });

  it('refuses a discard in a directory that is no checkout it can read', () => {
    expect(judge('git -C /nowhere reset --hard')).toEqual(
      unreadable('/nowhere is not a git checkout the hook can read'),
    );
  });

  it('lists no path line when git diff names none, as sed printed none', () => {
    const { world } = createWorld({ '.': { changed: [], diffStatus: 1 } });
    const verdict = judge('git reset --hard', world);
    expect(verdict.kind === 'refuse' ? verdict.lines[1] : '').toBe(
      '[no-discarding-reset] Commit them first — a commit is cheap and amendable:',
    );
  });

  it('refuses when git diff itself fails', () => {
    const { world } = createWorld({ '.': { changed: [], diffStatus: 129 } });
    expect(judge('git reset --hard', world)).toEqual(unreadable('git diff failed in .'));
  });

  it.each([
    'git reset --soft HEAD~1',
    'git status; git log | head',
    'echo "git reset --hard"',
    'cat <<EOF\ngit reset --hard\nEOF',
    '',
  ])('lets %j through, because it discards nothing', (command) => {
    expect(judge(command).kind).toBe('pass');
  });

  it('lets a call with no command through', () => {
    expect(judge(undefined).kind).toBe('pass');
    expect(
      noDiscardingReset.run({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }, DIRTY.world).kind,
    ).toBe('pass');
  });

  it('cuts the summary at 120 characters', () => {
    const longPath = 'x'.repeat(200);
    const { world } = createWorld({ '.': { changed: [longPath] } });
    const verdict = judge(`git restore ${longPath}`, world);
    expect(verdict.kind === 'refuse' ? verdict.summary : '').toBe(
      `ran \`${`git restore ${longPath}`.slice(0, 120)}\`, which would discard uncommitted work`,
    );
  });
});
