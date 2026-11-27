import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import { agentWorkFolder, listWorkFolders } from './agent-work-folder.core.ts';

interface RecordedCall {
  readonly command: string;
  readonly args: readonly string[];
}

function recordingWorld(calls: RecordedCall[]): HookWorld {
  return {
    projectDirectory: '/repo',
    readEnvironment: () => undefined,
    readText: () => null,
    run: (command, args) => {
      calls.push({ command, args });
      return { status: 0, stdout: '', stderr: '' };
    },
  };
}

function agentCall(toolInput: HookInput['tool_input']): HookInput {
  return { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_input: toolInput };
}

const SCRATCHPAD = '/tmp/claude-0/-home-user-repo/session-1/scratchpad';

// @FollowsBlueprint test-pure-unit
describe('listWorkFolders', () => {
  it('names each session scratchpad folder once, sorted, cut at the first space or slash, a dot included', () => {
    expect(
      listWorkFolders(
        `Work in ${SCRATCHPAD}/validator/ and log to ${SCRATCHPAD}/build.\nAgain ${SCRATCHPAD}/validator.`,
      ),
    ).toEqual([`${SCRATCHPAD}/build.`, `${SCRATCHPAD}/validator`, `${SCRATCHPAD}/validator.`]);
  });

  it('ignores a path outside a session scratchpad or with a label that starts with a dot', () => {
    expect(
      listWorkFolders(`/tmp/elsewhere/x /tmp/claude-x/p/s/scratchpad/a ${SCRATCHPAD}/.hidden`),
    ).toEqual([]);
  });
});

describe('agentWorkFolder', () => {
  it('fires on the Agent and Task tools only', () => {
    expect(agentWorkFolder.tools?.test('Agent')).toBe(true);
    expect(agentWorkFolder.tools?.test('Task')).toBe(true);
    expect(agentWorkFolder.tools?.test('TaskList')).toBe(false);
  });

  it('creates every folder the brief names in one mkdir and never refuses', () => {
    const calls: RecordedCall[] = [];

    expect(
      agentWorkFolder.run(
        agentCall({ prompt: `Use ${SCRATCHPAD}/b and ${SCRATCHPAD}/a.` }),
        recordingWorld(calls),
      ),
    ).toBe(PASS);
    expect(calls).toEqual([
      { command: 'mkdir', args: ['-p', `${SCRATCHPAD}/a.`, `${SCRATCHPAD}/b`] },
    ]);
  });

  it('runs nothing when the brief names no folder or carries no prompt text', () => {
    const calls: RecordedCall[] = [];
    const world = recordingWorld(calls);

    expect(agentWorkFolder.run(agentCall({ prompt: 'no folder here' }), world)).toBe(PASS);
    expect(agentWorkFolder.run(agentCall({ prompt: 7 }), world)).toBe(PASS);
    expect(agentWorkFolder.run({ hook_event_name: 'PreToolUse' }, world)).toBe(PASS);
    expect(calls).toEqual([]);
  });
});
