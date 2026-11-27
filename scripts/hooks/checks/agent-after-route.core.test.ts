import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS, refuse } from '../check.core.ts';
import { agentAfterRoute } from './agent-after-route.core.ts';

interface WorldSetup {
  readonly transcript?: string;
  readonly addedSpecs?: string;
}

function fakeWorld({ transcript, addedSpecs = '' }: WorldSetup): HookWorld {
  return {
    projectDirectory: '/repo',
    readEnvironment: () => undefined,
    readText: (path) => (path === '/t.jsonl' ? (transcript ?? null) : null),
    run: (command, args) => ({
      status: 0,
      stdout:
        command === 'git' &&
        args.join(' ') ===
          '-C /repo diff --name-only --diff-filter=A origin/main...HEAD -- docs/features/*/*/spec/spec.md'
          ? addedSpecs
          : '',
      stderr: '',
    }),
  };
}

function agentCall(fields: Partial<HookInput>, toolInput: HookInput['tool_input'] = {}): HookInput {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: 'Agent',
    tool_input: toolInput,
    transcript_path: '/t.jsonl',
    ...fields,
  };
}

const NOT_ROUTED = fakeWorld({ transcript: '{"type":"user"}' });

// @FollowsBlueprint test-pure-unit
describe('agentAfterRoute', () => {
  it('fires on the Agent and Task tools only', () => {
    expect(agentAfterRoute.tools?.test('Task')).toBe(true);
    expect(agentAfterRoute.tools?.test('Bash')).toBe(false);
  });

  it('refuses a general-purpose agent by default when nothing sized the work', () => {
    expect(agentAfterRoute.run(agentCall({}), NOT_ROUTED)).toEqual(
      refuse('agent-after-route', 'a general-purpose agent was spawned before /route ran', [
        'This session has not run /route, and its branch adds no spec.md.',
        'A general-purpose agent can write code, so size the work first: run /route.',
        'A Tier 2 feature shows the operator mockups and a spec before any build agent starts.',
      ]),
    );
  });

  it('refuses a general-purpose agent when the call carries no input at all', () => {
    const verdict = agentAfterRoute.run(
      { hook_event_name: 'PreToolUse', tool_name: 'Agent', transcript_path: '/t.jsonl' },
      NOT_ROUTED,
    );

    expect(verdict.kind === 'refuse' && verdict.summary).toBe(
      'a general-purpose agent was spawned before /route ran',
    );
  });

  it('names the agent type it refuses', () => {
    const verdict = agentAfterRoute.run(agentCall({}, { subagent_type: 'builder' }), NOT_ROUTED);

    expect(verdict.kind === 'refuse' && verdict.summary).toBe(
      'a builder agent was spawned before /route ran',
    );
  });

  it('lets a subagent pass, because it has no Agent tool of its own to misuse', () => {
    expect(agentAfterRoute.run(agentCall({ agent_id: 'a1' }), NOT_ROUTED)).toBe(PASS);
  });

  it('checks the main session when the agent id is empty', () => {
    expect(agentAfterRoute.run(agentCall({ agent_id: '' }), NOT_ROUTED).kind).toBe('refuse');
  });

  it('lets an agent type that only reads pass without /route', () => {
    expect(agentAfterRoute.run(agentCall({}, { subagent_type: 'Explore' }), NOT_ROUTED)).toBe(PASS);
  });

  it('passes once the transcript shows a framing skill called or typed', () => {
    const called = fakeWorld({ transcript: '{"name":"Skill","input":{"skill":"route"}}' });
    const calledSpaced = fakeWorld({ transcript: '"skill": "specification"' });
    const typed = fakeWorld({ transcript: '<command-name>/after-task-kaizen</command-name>' });

    expect(agentAfterRoute.run(agentCall({}), called)).toBe(PASS);
    expect(agentAfterRoute.run(agentCall({}), calledSpaced)).toBe(PASS);
    expect(agentAfterRoute.run(agentCall({}), typed)).toBe(PASS);
  });

  it('does not count a skill whose name only starts like a framing one', () => {
    const lookalike = fakeWorld({ transcript: '"skill":"router"' });

    expect(agentAfterRoute.run(agentCall({}), lookalike).kind).toBe('refuse');
  });

  it('reads no transcript when its path is missing, empty or unreadable', () => {
    const routed: HookWorld = { ...NOT_ROUTED, readText: () => '"skill":"route"' };

    expect(agentAfterRoute.run(agentCall({ transcript_path: undefined }), routed).kind).toBe(
      'refuse',
    );
    expect(agentAfterRoute.run(agentCall({ transcript_path: '' }), routed).kind).toBe('refuse');
    expect(agentAfterRoute.run(agentCall({}), fakeWorld({})).kind).toBe('refuse');
  });

  it('does not read a blank diff as an added spec', () => {
    expect(agentAfterRoute.run(agentCall({}), fakeWorld({ addedSpecs: '\n' })).kind).toBe('refuse');
  });

  it('passes on a branch that already adds a spec, even in a resumed session', () => {
    const framed = fakeWorld({ addedSpecs: 'docs/features/pragma/x/spec/spec.md\n' });

    expect(agentAfterRoute.run(agentCall({}), framed)).toBe(PASS);
  });
});
