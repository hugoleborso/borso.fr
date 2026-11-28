import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS, refuse } from '../check.core.ts';
import { agentAfterRoute } from './agent-after-route.core.ts';

interface WorldSetup {
  readonly transcript?: string;
  readonly addedSpecs?: string;
  readonly changedApps?: string;
}

const SPEC_DIFF =
  '-C /repo diff --name-only --diff-filter=A origin/main...HEAD -- docs/features/*/*/spec/spec.md';
const APP_STATUS = '-C /repo status --porcelain -- apps/';

function fakeWorld({
  transcript,
  addedSpecs = '',
  changedApps = ' M apps/pragma/a.ts\n',
}: WorldSetup): HookWorld {
  const outputs: Readonly<Record<string, string>> = {
    [SPEC_DIFF]: addedSpecs,
    [APP_STATUS]: changedApps,
  };
  return {
    projectDirectory: '/repo',
    readEnvironment: () => undefined,
    readText: (path) => (path === '/t.jsonl' ? (transcript ?? null) : null),
    run: (command, args) => ({
      status: 0,
      stdout: command === 'git' ? (outputs[args.join(' ')] ?? '') : '',
      stderr: '',
    }),
  };
}

const APP_EDIT: HookInput = {
  hook_event_name: 'PostToolUse',
  tool_name: 'Bash',
  tool_input: { command: "python3 - <<'EOF'" },
  transcript_path: '/t.jsonl',
};

const NOT_ROUTED = fakeWorld({ transcript: '{"type":"user"}' });

// @FollowsBlueprint test-pure-unit
describe('agentAfterRoute', () => {
  it('fires after the shell and the file-writing tools', () => {
    for (const tool of ['Bash', 'Write', 'Edit', 'MultiEdit']) {
      expect(agentAfterRoute.tools?.test(tool)).toBe(true);
    }
    for (const tool of ['Agent', 'Editor', 'AWrite', 'Read']) {
      expect(agentAfterRoute.tools?.test(tool)).toBe(false);
    }
  });

  it('refuses once an app file changed before /route, however it was written', () => {
    expect(agentAfterRoute.run(APP_EDIT, NOT_ROUTED)).toEqual(
      refuse('agent-after-route', 'apps/pragma/a.ts changed before /route ran', [
        'This session has not run /route, and its branch adds no spec.md.',
        'Size the work before the first change to an app: run /route. A one-file fix comes back Tier 0.',
        'A Tier 2 feature shows the operator mockups and a spec before any code.',
      ]),
    );
    const untracked = fakeWorld({ changedApps: '?? apps/talos/n.ts\n M apps/b.ts\n' });
    expect(agentAfterRoute.run(APP_EDIT, untracked)).toEqual(
      expect.objectContaining({ summary: 'apps/talos/n.ts changed before /route ran' }),
    );
  });

  it('refuses a subagent too, since it reads the same session transcript', () => {
    expect(agentAfterRoute.run({ ...APP_EDIT, agent_id: 'a1' }, NOT_ROUTED).kind).toBe('refuse');
  });

  it('passes while no file under apps/ has changed', () => {
    expect(agentAfterRoute.run(APP_EDIT, fakeWorld({ changedApps: '' }))).toBe(PASS);
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
