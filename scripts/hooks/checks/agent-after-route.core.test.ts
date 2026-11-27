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

function editCall(tool: string, toolInput: HookInput['tool_input']): HookInput {
  return agentCall({ tool_name: tool }, toolInput);
}

const NOT_ROUTED = fakeWorld({ transcript: '{"type":"user"}' });

// @FollowsBlueprint test-pure-unit
describe('agentAfterRoute', () => {
  it('fires on the agent tools and the file-writing tools only', () => {
    for (const tool of ['Agent', 'Task', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit']) {
      expect(agentAfterRoute.tools?.test(tool)).toBe(true);
    }
    expect(agentAfterRoute.tools?.test('Bash')).toBe(false);
    expect(agentAfterRoute.tools?.test('Editor')).toBe(false);
    expect(agentAfterRoute.tools?.test('AWrite')).toBe(false);
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

  describe('a file edit by the main session', () => {
    it('refuses the first edit of an app file, absolute or relative, before /route', () => {
      expect(
        agentAfterRoute.run(
          editCall('Write', { file_path: '/repo/apps/pragma/api/src/x.core.ts' }),
          NOT_ROUTED,
        ),
      ).toEqual(
        refuse('agent-after-route', 'apps/pragma/api/src/x.core.ts was edited before /route ran', [
          'This session has not run /route, and its branch adds no spec.md.',
          'Size the work before the first change to an app: run /route. A one-file fix comes back Tier 0.',
          'A Tier 2 feature shows the operator mockups and a spec before any code.',
        ]),
      );
      expect(
        agentAfterRoute.run(editCall('Edit', { file_path: 'apps/pragma/site/a.tsx' }), NOT_ROUTED)
          .kind,
      ).toBe('refuse');
      expect(
        agentAfterRoute.run(
          editCall('NotebookEdit', { notebook_path: '/repo/apps/talos/n.ipynb' }),
          NOT_ROUTED,
        ).kind,
      ).toBe('refuse');
    });

    it('lets an edit outside apps/ pass, such as a script, a doc or another checkout', () => {
      for (const path of [
        '/repo/scripts/a.ts',
        'docs/x.md',
        '/elsewhere/apps/a.ts',
        '/repoapps/a.ts',
      ]) {
        expect(agentAfterRoute.run(editCall('Edit', { file_path: path }), NOT_ROUTED)).toBe(PASS);
      }
    });

    it('lets an edit with no path pass', () => {
      expect(agentAfterRoute.run(editCall('Write', {}), NOT_ROUTED)).toBe(PASS);
      expect(agentAfterRoute.run(editCall('Write', { file_path: 3 }), NOT_ROUTED)).toBe(PASS);
      expect(
        agentAfterRoute.run(
          { hook_event_name: 'PreToolUse', tool_name: 'Edit', transcript_path: '/t.jsonl' },
          NOT_ROUTED,
        ),
      ).toBe(PASS);
    });

    it('lets an app edit pass once /route ran or the branch adds a spec', () => {
      const routed = fakeWorld({ transcript: '"skill":"route"' });
      const framed = fakeWorld({ addedSpecs: 'docs/features/pragma/x/spec/spec.md\n' });
      const call = editCall('Edit', { file_path: 'apps/pragma/a.ts' });

      expect(agentAfterRoute.run(call, routed)).toBe(PASS);
      expect(agentAfterRoute.run(call, framed)).toBe(PASS);
    });

    it('lets a subagent edit an app file, since its brief came after the sizing', () => {
      expect(
        agentAfterRoute.run(
          agentCall({ tool_name: 'Write', agent_id: 'a1' }, { file_path: 'apps/pragma/a.ts' }),
          NOT_ROUTED,
        ),
      ).toBe(PASS);
    });

    it('reads a call with no tool name as an edit', () => {
      expect(
        agentAfterRoute.run(
          { hook_event_name: 'PreToolUse', tool_input: { file_path: 'apps/x/a.ts' } },
          NOT_ROUTED,
        ).kind,
      ).toBe('refuse');
    });
  });
});
