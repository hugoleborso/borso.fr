import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import { validationRunsAsItsAgent } from './validation-runs-as-its-agent.core.ts';

const WORLD: HookWorld = {
  projectDirectory: '/repository',
  readEnvironment: () => undefined,
  readText: () => null,
  run: () => ({ status: 0, stdout: '', stderr: '' }),
};

function buildInput(skill: unknown, agentId?: string): HookInput {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: 'Skill',
    tool_input: { skill },
    ...(agentId === undefined ? {} : { agent_id: agentId }),
  };
}

// @FollowsBlueprint test-pure-unit
describe('validationRunsAsItsAgent', () => {
  it('answers Skill calls only, like its settings matcher', () => {
    expect(validationRunsAsItsAgent.tools?.test('Skill')).toBe(true);
    expect(validationRunsAsItsAgent.tools?.test('Agent')).toBe(false);
  });

  it('refuses /technical-validation in a subagent, which has no Agent tool to dispatch the isolated validator', () => {
    expect(
      validationRunsAsItsAgent.run(buildInput('technical-validation', 'agent-1'), WORLD),
    ).toEqual({
      kind: 'refuse',
      rule: 'validation-runs-as-its-agent',
      summary:
        'a subagent loaded /technical-validation, which needs the Agent tool it does not have',
      lines: [
        '[validation-runs-as-its-agent] /technical-validation dispatches the isolated technical-validator agent, and a subagent has no Agent tool.',
        '[validation-runs-as-its-agent] Validating here would run the review in a context that is not isolated.',
        '[validation-runs-as-its-agent] Stop, and return status blocked with next.kind escalate and reason validator-needs-dispatch.',
        '[validation-runs-as-its-agent] The main session then calls Agent with subagent_type "technical-validator" and the brief from .claude/skills/technical-validation/template.md.',
      ],
    });
  });

  it('names the visual validator for /visual-validation', () => {
    const verdict = validationRunsAsItsAgent.run(buildInput('visual-validation', 'agent-1'), WORLD);

    expect(verdict.kind === 'refuse' && verdict.lines.at(-1)).toBe(
      '[validation-runs-as-its-agent] The main session then calls Agent with subagent_type "visual-validator" and the brief from .claude/skills/visual-validation/template.md.',
    );
  });

  it.each([
    ['the main session, where agent_id is absent', 'technical-validation', undefined],
    ['an empty agent_id', 'visual-validation', ''],
    ['another skill in a subagent', 'open-pr', 'agent-1'],
    ['a skill name that is not text', 7, 'agent-1'],
  ])('lets %s through', (_shape, skill, agentId) => {
    expect(validationRunsAsItsAgent.run(buildInput(skill, agentId), WORLD)).toBe(PASS);
  });

  it('lets a call with no input through', () => {
    expect(
      validationRunsAsItsAgent.run(
        { hook_event_name: 'PreToolUse', tool_name: 'Skill', agent_id: 'agent-1' },
        WORLD,
      ),
    ).toBe(PASS);
  });
});
