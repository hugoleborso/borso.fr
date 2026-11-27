import { describe, expect, it } from 'vitest';
import type { CommandResult, HookInput, HookWorld } from '../check.core.ts';
import { PASS } from '../check.core.ts';
import { sessionEnv } from './session-env.core.ts';

const INPUT: HookInput = { hook_event_name: 'SessionStart' };

function createWorld(
  environment: Readonly<Record<string, string>>,
  made: CommandResult = { status: 0, stdout: '/tmp/claude-session.Ab12Cd\n', stderr: '' },
): { world: HookWorld; calls: (readonly unknown[])[] } {
  const calls: (readonly unknown[])[] = [];
  const world: HookWorld = {
    projectDirectory: '/repo',
    readEnvironment: (name) => environment[name],
    readText: () => null,
    run: (command, args, input) => {
      calls.push([command, ...args, input]);
      return command === 'mktemp' ? made : { status: 0, stdout: '', stderr: '' };
    },
  };
  return { world, calls };
}

// @FollowsBlueprint test-pure-unit
describe('sessionEnv gives the session shell a TMPDIR, so no $TMPDIR file lands at the root', () => {
  it('makes a session folder and exports it when TMPDIR is empty', () => {
    const { world, calls } = createWorld({ CLAUDE_ENV_FILE: '/env', TMPDIR: '' });

    expect(sessionEnv.run(INPUT, world)).toBe(PASS);
    expect(calls).toEqual([
      ['mktemp', '-d', '/tmp/claude-session.XXXXXX', undefined],
      ['tee', '-a', '/env', 'export TMPDIR=/tmp/claude-session.Ab12Cd\n'],
    ]);
  });

  it('exports the folder mktemp printed without its trailing line breaks only', () => {
    const { world, calls } = createWorld(
      { CLAUDE_ENV_FILE: '/env' },
      { status: 0, stdout: '/tmp/a\nb\n\n', stderr: '' },
    );
    sessionEnv.run(INPUT, world);

    expect(calls.at(-1)).toEqual(['tee', '-a', '/env', "export TMPDIR=$'/tmp/a\\nb'\n"]);
  });

  it('does nothing without an env file, or when TMPDIR is already set', () => {
    const noFile = createWorld({ CLAUDE_ENV_FILE: '' });
    const alreadySet = createWorld({ CLAUDE_ENV_FILE: '/env', TMPDIR: '/t' });
    sessionEnv.run(INPUT, noFile.world);
    sessionEnv.run(INPUT, alreadySet.world);

    expect([...noFile.calls, ...alreadySet.calls]).toEqual([]);
  });

  it('writes nothing when the folder cannot be made', () => {
    const { world, calls } = createWorld(
      { CLAUDE_ENV_FILE: '/env' },
      {
        status: 1,
        stdout: '',
        stderr: 'no space',
      },
    );
    sessionEnv.run(INPUT, world);

    expect(calls).toHaveLength(1);
  });
});
