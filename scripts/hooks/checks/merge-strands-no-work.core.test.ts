import { describe, expect, it } from 'vitest';
import type { CommandResult, HookInput, HookWorld } from '../check.core.ts';
import { mergeStrandsNoWork } from './merge-strands-no-work.core.ts';

function answer(stdout: string, status = 0): CommandResult {
  return { status, stdout, stderr: '' };
}

function createWorld(answers: Record<string, CommandResult>): {
  world: HookWorld;
  calls: string[];
} {
  const calls: string[] = [];
  const world: HookWorld = {
    projectDirectory: '/repository',
    readEnvironment: () => undefined,
    readText: () => null,
    run: (command, args) => {
      const call = [command, ...args].join(' ');
      calls.push(call);
      return answers[call] ?? answer('', 1);
    },
  };
  return { world, calls };
}

const MERGE: HookInput = {
  hook_event_name: 'PreToolUse',
  tool_name: 'mcp__github__merge_pull_request',
  tool_input: { pullNumber: 412 },
  cwd: '/session',
};

const ROOT = { 'git -C /session rev-parse --show-toplevel': answer('/checkout\n') };
const CLEAN = {
  ...ROOT,
  'git -C /checkout status --porcelain --untracked-files=no': answer(''),
  'git -C /checkout stash list': answer(''),
};

// @FollowsBlueprint test-pure-unit
describe('mergeStrandsNoWork', () => {
  it('fires only on merge_pull_request', () => {
    expect(mergeStrandsNoWork.tools?.test('mcp__github__merge_pull_request')).toBe(true);
    expect(mergeStrandsNoWork.tools?.test('Bash')).toBe(false);
  });

  it('refuses a merge while tracked changes or stashes exist, because the container is reclaimed with them', () => {
    const { world } = createWorld({
      ...CLEAN,
      'git -C /checkout status --porcelain --untracked-files=no': answer(' M a.ts\nM  b.ts\n'),
      'git -C /checkout stash list': answer('stash@{0}: On main: probe\n'),
    });
    expect(mergeStrandsNoWork.run(MERGE, world)).toEqual({
      kind: 'refuse',
      rule: 'merge-strands-no-work',
      summary: 'merged with uncommitted or stashed work in the container',
      lines: [
        '[merge-strands-no-work] this container holds work no branch has, and it is reclaimed after the merge:',
        '[merge-strands-no-work]   changed:  M a.ts',
        '[merge-strands-no-work]   changed: M  b.ts',
        '[merge-strands-no-work]   stashed: stash@{0}: On main: probe',
        "[merge-strands-no-work] If it belongs to this pull request, commit it and push it to the pull request's branch.",
        '[merge-strands-no-work] If it is for later, push it to a branch of its own, for example:',
        "[merge-strands-no-work]   git stash branch claude/<slug>-wip && git commit -am 'wip' && git push -u origin claude/<slug>-wip",
        '[merge-strands-no-work] The operator asks for that push here, so a session told to push to one branch only makes it too.',
        '[merge-strands-no-work] A patch file in the scratchpad is not a way out: it is reclaimed with the container.',
        '[merge-strands-no-work] Or drop it, with its own confirmation from the operator, then merge.',
      ],
    });
  });

  it('refuses on a stash alone', () => {
    const { world } = createWorld({ ...CLEAN, 'git -C /checkout stash list': answer('stash@{0}') });
    expect(mergeStrandsNoWork.run(MERGE, world).kind).toBe('refuse');
  });

  it('lets a merge from a clean checkout through, untracked files not counted', () => {
    const { world } = createWorld(CLEAN);
    expect(mergeStrandsNoWork.run(MERGE, world).kind).toBe('pass');
  });

  it('reads the checkout the session runs in, or the project one when no cwd is given', () => {
    const { world, calls } = createWorld({});
    expect(mergeStrandsNoWork.run({ ...MERGE, cwd: undefined }, world).kind).toBe('pass');
    expect(calls).toEqual(['git rev-parse --show-toplevel']);
  });

  it.each([
    'git -C /checkout status --porcelain --untracked-files=no',
    'git -C /checkout stash list',
  ])('lets the merge through when %s fails, as the old set -e exit did', (failing) => {
    const { world } = createWorld({ ...CLEAN, [failing]: answer(' M a.ts', 128) });
    expect(mergeStrandsNoWork.run(MERGE, world).kind).toBe('pass');
  });
});
