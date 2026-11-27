import { describe, expect, it } from 'vitest';
import { type HookInput, type HookWorld, PASS } from '../check.core.ts';
import { specBriefRunsASkill } from './spec-brief-runs-a-skill.core.ts';

const WORLD: HookWorld = {
  projectDirectory: '/repository',
  readEnvironment: () => undefined,
  readText: () => null,
  run: () => ({ status: 0, stdout: '', stderr: '' }),
};
const SPEC = 'docs/features/pragma/visitor-qr-code/spec/spec.md';

function buildInput(prompt: unknown, subagentType?: string): HookInput {
  return {
    hook_event_name: 'PreToolUse',
    tool_name: 'Agent',
    tool_input: { prompt, ...(subagentType === undefined ? {} : { subagent_type: subagentType }) },
  };
}

// @FollowsBlueprint test-pure-unit
describe('specBriefRunsASkill', () => {
  it('answers Agent and Task calls only', () => {
    expect(specBriefRunsASkill.tools?.test('Agent')).toBe(true);
    expect(specBriefRunsASkill.tools?.test('Task')).toBe(true);
    expect(specBriefRunsASkill.tools?.test('Skill')).toBe(false);
  });

  it('refuses a brief that names a spec and restates it instead of naming a skill', () => {
    const verdict = specBriefRunsASkill.run(
      buildInput(`Spec: ${SPEC}. Use className="w-full max-w-80".`, 'general-purpose'),
      WORLD,
    );

    expect(verdict).toEqual({
      kind: 'refuse',
      rule: 'spec-brief-runs-a-skill',
      summary: 'a brief names a spec but no skill that reads it',
      lines: [
        '[spec-brief-runs-a-skill] This brief hands an agent a spec and tells it what to build in its own words.',
        '[spec-brief-runs-a-skill] The agent follows the brief over the spec, so each restated detail is a second contract.',
        '[spec-brief-runs-a-skill] PR #421 shipped two such details, and each cost a validation round.',
        '[spec-brief-runs-a-skill] Name the skill instead, for example "/implementation docs/features/<app>/<slug>/spec/spec.md".',
        '[spec-brief-runs-a-skill] The brief keeps the goal, the work folder and the kaizen line, and leaves behaviour to the spec.',
      ],
    });
  });

  it.each([
    ['a brief that runs /implementation', `/implementation ${SPEC}`, undefined],
    ['a brief that runs /dantotsu', `/dantotsu on ${SPEC}`, 'general-purpose'],
    ['the technical validator', `spec_path: ${SPEC}`, 'technical-validator'],
    ['the visual validator', `spec_path: ${SPEC}`, 'visual-validator'],
    ['a brief that names no spec', 'Fix the tests the report names.', 'general-purpose'],
    ['a prompt that is not text', 7, undefined],
  ])('lets %s through', (_shape, prompt, subagentType) => {
    expect(specBriefRunsASkill.run(buildInput(prompt, subagentType), WORLD)).toBe(PASS);
  });

  it('lets a call with no input through', () => {
    expect(
      specBriefRunsASkill.run({ hook_event_name: 'PreToolUse', tool_name: 'Agent' }, WORLD),
    ).toBe(PASS);
  });
});
