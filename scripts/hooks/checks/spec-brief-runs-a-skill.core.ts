// @FollowsBlueprint utils-pure-module
import { type Check, PASS, refuse } from '../check.core.ts';

const RULE = 'spec-brief-runs-a-skill';
const SPEC_PATH = /docs\/features\/[^/\s]+\/[^/\s]+\/spec\/spec\.md/u;
const SKILL_NAMED =
  /\/(implementation|specification|technical-conception|feature-pipeline|tech-lead-orchestrator|after-task-kaizen|dantotsu|technical-validation|visual-validation)\b/u;
const VALIDATORS = new Set(['technical-validator', 'visual-validator']);

export const specBriefRunsASkill: Check = {
  name: RULE,
  tools: /^(Agent|Task)$/u,
  run(input) {
    const prompt = String(input.tool_input?.['prompt']);
    const agentType = String(input.tool_input?.['subagent_type']);
    if (!SPEC_PATH.test(prompt) || VALIDATORS.has(agentType) || SKILL_NAMED.test(prompt)) {
      return PASS;
    }
    return refuse(RULE, 'a brief names a spec but no skill that reads it', [
      'This brief hands an agent a spec and tells it what to build in its own words.',
      'The agent follows the brief over the spec, so each restated detail is a second contract.',
      'PR #421 shipped two such details, and each cost a validation round.',
      'Name the skill instead, for example "/implementation docs/features/<app>/<slug>/spec/spec.md".',
      'The brief keeps the goal, the work folder and the kaizen line, and leaves behaviour to the spec.',
    ]);
  },
};
