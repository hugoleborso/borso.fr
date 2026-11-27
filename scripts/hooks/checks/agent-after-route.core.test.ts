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

function editCall(toolInput: HookInput['tool_input'], fields: Partial<HookInput> = {}): HookInput {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: 'Edit',
    tool_input: toolInput,
    transcript_path: '/t.jsonl',
    ...fields,
  };
}

const NOT_ROUTED = fakeWorld({ transcript: '{"type":"user"}' });
const APP_EDIT = editCall({ file_path: 'apps/pragma/a.ts' });

// @FollowsBlueprint test-pure-unit
describe('agentAfterRoute', () => {
  it('fires on the file-writing tools only', () => {
    for (const tool of ['Write', 'Edit', 'MultiEdit', 'NotebookEdit']) {
      expect(agentAfterRoute.tools?.test(tool)).toBe(true);
    }
    for (const tool of ['Bash', 'Agent', 'Editor', 'AWrite']) {
      expect(agentAfterRoute.tools?.test(tool)).toBe(false);
    }
  });

  it('refuses the first edit of an app file, absolute or relative, before /route', () => {
    expect(
      agentAfterRoute.run(
        editCall({ file_path: '/repo/apps/pragma/api/src/x.core.ts' }),
        NOT_ROUTED,
      ),
    ).toEqual(
      refuse('agent-after-route', 'apps/pragma/api/src/x.core.ts was edited before /route ran', [
        'This session has not run /route, and its branch adds no spec.md.',
        'Size the work before the first change to an app: run /route. A one-file fix comes back Tier 0.',
        'A Tier 2 feature shows the operator mockups and a spec before any code.',
      ]),
    );
    expect(agentAfterRoute.run(APP_EDIT, NOT_ROUTED).kind).toBe('refuse');
    expect(
      agentAfterRoute.run(editCall({ notebook_path: '/repo/apps/talos/n.ipynb' }), NOT_ROUTED).kind,
    ).toBe('refuse');
  });

  it('refuses a subagent too, since it reads the same session transcript', () => {
    expect(agentAfterRoute.run({ ...APP_EDIT, agent_id: 'a1' }, NOT_ROUTED).kind).toBe('refuse');
  });

  it('lets an edit outside apps/ pass, such as a script, a doc or another checkout', () => {
    for (const path of [
      '/repo/scripts/a.ts',
      'docs/x.md',
      '/elsewhere/apps/a.ts',
      '/repoapps/a.ts',
    ]) {
      expect(agentAfterRoute.run(editCall({ file_path: path }), NOT_ROUTED)).toBe(PASS);
    }
  });

  it('lets an edit with no path pass', () => {
    expect(agentAfterRoute.run(editCall({}), NOT_ROUTED)).toBe(PASS);
    expect(agentAfterRoute.run(editCall({ file_path: 3 }), NOT_ROUTED)).toBe(PASS);
    expect(
      agentAfterRoute.run(
        { hook_event_name: 'PreToolUse', tool_name: 'Edit', transcript_path: '/t.jsonl' },
        NOT_ROUTED,
      ),
    ).toBe(PASS);
  });

  it('passes once the transcript shows a framing skill called or typed', () => {
    const called = fakeWorld({ transcript: '{"name":"Skill","input":{"skill":"route"}}' });
    const calledSpaced = fakeWorld({ transcript: '"skill": "specification"' });
    const typed = fakeWorld({ transcript: '<command-name>/after-task-kaizen</command-name>' });

    expect(agentAfterRoute.run(APP_EDIT, called)).toBe(PASS);
    expect(agentAfterRoute.run(APP_EDIT, calledSpaced)).toBe(PASS);
    expect(agentAfterRoute.run(APP_EDIT, typed)).toBe(PASS);
  });

  it('does not count a skill whose name only starts like a framing one', () => {
    const lookalike = fakeWorld({ transcript: '"skill":"router"' });

    expect(agentAfterRoute.run(APP_EDIT, lookalike).kind).toBe('refuse');
  });

  it('reads no transcript when its path is missing, empty or unreadable', () => {
    const routed: HookWorld = { ...NOT_ROUTED, readText: () => '"skill":"route"' };

    expect(agentAfterRoute.run({ ...APP_EDIT, transcript_path: undefined }, routed).kind).toBe(
      'refuse',
    );
    expect(agentAfterRoute.run({ ...APP_EDIT, transcript_path: '' }, routed).kind).toBe('refuse');
    expect(agentAfterRoute.run(APP_EDIT, fakeWorld({})).kind).toBe('refuse');
  });

  it('does not read a blank diff as an added spec', () => {
    expect(agentAfterRoute.run(APP_EDIT, fakeWorld({ addedSpecs: '\n' })).kind).toBe('refuse');
  });

  it('passes on a branch that already adds a spec, even in a resumed session', () => {
    const framed = fakeWorld({ addedSpecs: 'docs/features/pragma/x/spec/spec.md\n' });

    expect(agentAfterRoute.run(APP_EDIT, framed)).toBe(PASS);
  });
});
