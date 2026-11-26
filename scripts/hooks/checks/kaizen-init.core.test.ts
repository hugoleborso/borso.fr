import { describe, expect, it } from 'vitest';
import type { CommandResult, HookInput, HookWorld } from '../check.core.ts';
import { PASS } from '../check.core.ts';
import { kaizenInit } from './kaizen-init.core.ts';

const INPUT: HookInput = { hook_event_name: 'SessionStart' };

function createWorld(result: CommandResult): { world: HookWorld; calls: unknown[] } {
  const calls: unknown[] = [];
  const world: HookWorld = {
    projectDirectory: '/repo',
    readEnvironment: () => undefined,
    readText: () => null,
    run: (command, args) => {
      calls.push([command, ...args]);
      return result;
    },
  };
  return { world, calls };
}

// @FollowsBlueprint test-pure-unit
describe('kaizenInit opens the friction log at session start, so it exists before anyone needs it', () => {
  it('runs kaizen.sh init and says nothing when it prints nothing', () => {
    const { world, calls } = createWorld({ status: 0, stdout: '', stderr: '' });

    expect(kaizenInit.run(INPUT, world)).toBe(PASS);
    expect(calls).toEqual([['/repo/scripts/kaizen.sh', 'init']]);
  });

  it('hands the line about a parked log to the session', () => {
    const parked = '[kaizen] 1 entries from session other were never archived\n';

    expect(
      kaizenInit.run(INPUT, createWorld({ status: 0, stdout: parked, stderr: '' }).world),
    ).toEqual({ kind: 'context', text: parked });
  });

  it('hands both streams to the session when init fails', () => {
    const failed = { status: 1, stdout: 'a\n', stderr: 'b\n' };

    expect(kaizenInit.run(INPUT, createWorld(failed).world)).toEqual({
      kind: 'context',
      text: 'a\nb\n',
    });
  });
});
