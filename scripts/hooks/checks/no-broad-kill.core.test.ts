import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import { noBroadKill } from './no-broad-kill.core.ts';

const WORLD: HookWorld = {
  projectDirectory: '/repository',
  readEnvironment: () => undefined,
  readText: () => null,
  run: () => ({ status: 0, stdout: '', stderr: '' }),
};

const SHARED_MACHINE_LINES = [
  '[no-broad-kill] This machine is shared with other agents and with long-running measurements.',
  '[no-broad-kill] Main session, started it with run_in_background? Stop it with TaskStop and its task id.',
  '[no-broad-kill] A dev server: scripts/dev-server.sh start <app>, then scripts/dev-server.sh stop <app>.',
  '[no-broad-kill] It owns its process group, so stop takes pnpm, concurrently and every server they started, and nothing else.',
  '[no-broad-kill] Any other process: kill the pid you started, never a name.',
];

function buildInput(command: unknown): HookInput {
  return { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command } };
}

// @FollowsBlueprint test-pure-unit
describe('noBroadKill', () => {
  it('answers Bash calls only, like its settings matcher', () => {
    expect(noBroadKill.tools?.test('Bash')).toBe(true);
    expect(noBroadKill.tools?.test('Write')).toBe(false);
  });

  it("refuses pkill, because a name pattern also matches other agents' processes", () => {
    expect(noBroadKill.run(buildInput('pkill -f vite'), WORLD)).toEqual({
      kind: 'refuse',
      rule: 'no-broad-kill',
      summary: 'reached for pkill or killall on a machine other agents share',
      lines: [
        "[no-broad-kill] pkill / killall matches every process whose command line contains the pattern, including other agents'.",
        ...SHARED_MACHINE_LINES,
      ],
    });
  });

  it.each([
    ['behind sudo', 'sudo killall node'],
    ['after a chain', 'ls; killall5 -9'],
    ['on a later line', 'echo start\npkill vitest'],
  ])('refuses a name kill %s, since the old pattern read any unquoted word', (_shape, command) => {
    expect(noBroadKill.run(buildInput(command), WORLD).kind).toBe('refuse');
  });

  it('refuses pgrep piped into xargs kill, which is pkill spelled differently', () => {
    expect(noBroadKill.run(buildInput('pgrep -f vitest | xargs -r kill'), WORLD)).toEqual({
      kind: 'refuse',
      rule: 'no-broad-kill',
      summary: 'reached for pkill or killall on a machine other agents share',
      lines: [
        '[no-broad-kill] pgrep piped into xargs kill is pkill spelled differently, with the same blast radius.',
        ...SHARED_MACHINE_LINES,
      ],
    });
  });

  it("refuses agent-browser close --all, which ends every agent's browser session", () => {
    expect(noBroadKill.run(buildInput('agent-browser close --all'), WORLD)).toEqual({
      kind: 'refuse',
      rule: 'no-broad-kill',
      summary: 'reached for agent-browser close --all on a machine other agents share',
      lines: [
        "[no-broad-kill] agent-browser close --all closes every agent's browser session, not only yours.",
        '[no-broad-kill] Close the session you opened: agent-browser --session <name> close, or agent-browser close for the default one.',
      ],
    });
  });

  it('refuses close --all with flags on either side of close', () => {
    expect(
      noBroadKill.run(buildInput('agent-browser --session a close --force --all'), WORLD).kind,
    ).toBe('refuse');
  });

  it.each([
    ['a quoted label naming pkill', 'echo "never run pkill here"'],
    ['a heredoc body naming killall', "cat > notes.md <<'EOF'\nkillall is banned\nEOF"],
    ['a binary given by path', '/usr/bin/pkill -f vite'],
    ['pgrep on one line and xargs kill on the next', 'pgrep -f vite |\nxargs kill'],
    ['closing your own browser session', 'agent-browser --session a close'],
    ['--all after the chain ends', 'agent-browser close; ls --all'],
    ['an ordinary process listing', 'ps aux | grep node'],
  ])('lets %s through', (_shape, command) => {
    expect(noBroadKill.run(buildInput(command), WORLD)).toBe(PASS);
  });

  it('passes a call with no command or a command that is not text', () => {
    expect(noBroadKill.run(buildInput(''), WORLD)).toBe(PASS);
    expect(noBroadKill.run(buildInput(null), WORLD)).toBe(PASS);
    expect(noBroadKill.run({ hook_event_name: 'PreToolUse', tool_name: 'Bash' }, WORLD)).toBe(PASS);
  });
});
