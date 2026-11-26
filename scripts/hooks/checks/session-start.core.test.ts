import { describe, expect, it } from 'vitest';
import type { CommandResult, HookInput, HookWorld } from '../check.core.ts';
import { PASS } from '../check.core.ts';
import { sessionStart } from './session-start.core.ts';

const INPUT: HookInput = { hook_event_name: 'SessionStart', source: 'startup' };
const INSTALLED: CommandResult = { status: 0, stdout: '[install-repo-deps] done\n', stderr: 'x' };

interface Call {
  readonly command: string;
  readonly args: readonly string[];
  readonly input: string | undefined;
}

function createWorld(
  install: CommandResult,
  environment: Readonly<Record<string, string>>,
  browsers = '',
): { world: HookWorld; calls: Call[] } {
  const calls: Call[] = [];
  const world: HookWorld = {
    projectDirectory: '/repo',
    readEnvironment: (name) => environment[name],
    readText: () => null,
    run: (command, args, input) => {
      calls.push({ command, args, input });
      if (args[0] === '/repo/scripts/install-repo-deps.sh') return install;
      return { status: 0, stdout: command === 'bash' ? browsers : '', stderr: '' };
    },
  };
  return { world, calls };
}

// @FollowsBlueprint test-pure-unit
describe('sessionStart', () => {
  it('installs the dependencies and hands what the install printed to the session', () => {
    const { world, calls } = createWorld(INSTALLED, {});

    expect(sessionStart.run(INPUT, world)).toEqual({
      kind: 'context',
      text: '[install-repo-deps] done\n',
    });
    expect(calls).toEqual([
      { command: 'bash', args: ['/repo/scripts/install-repo-deps.sh'], input: undefined },
    ]);
  });

  it('puts the user bin folder on PATH for later tool calls', () => {
    const { world, calls } = createWorld(INSTALLED, { CLAUDE_ENV_FILE: '/env' });
    sessionStart.run(INPUT, world);

    expect(calls.slice(1)).toEqual([
      { command: 'tee', args: ['-a', '/env'], input: 'export PATH="$HOME/.local/bin:$PATH"\n' },
      {
        command: 'bash',
        args: ['/repo/scripts/browser/playwright-browsers.sh'],
        input: undefined,
      },
    ]);
  });

  it('points Playwright at the aligned browsers folder, quoted for the shell', () => {
    const { world, calls } = createWorld(INSTALLED, { CLAUDE_ENV_FILE: '/env' }, '/a b\n\n');
    sessionStart.run(INPUT, world);

    expect(calls.at(-1)).toEqual({
      command: 'tee',
      args: ['-a', '/env'],
      input: 'export PLAYWRIGHT_BROWSERS_PATH=/a\\ b\n',
    });
  });

  it('stops after a failed install and hands both streams to the session', () => {
    const failed: CommandResult = { status: 1, stdout: 'running\n', stderr: 'ERROR: no pnpm\n' };
    const { world, calls } = createWorld(failed, { CLAUDE_ENV_FILE: '/env' });

    expect(sessionStart.run(INPUT, world)).toEqual({
      kind: 'context',
      text: 'running\nERROR: no pnpm\n',
    });
    expect(calls).toHaveLength(1);
  });

  it('says nothing when the install printed nothing', () => {
    const { world } = createWorld({ status: 0, stdout: '', stderr: '' }, {});

    expect(sessionStart.run(INPUT, world)).toBe(PASS);
  });
});
