// @FollowsBlueprint utils-pure-module
import { type Check, PASS, refuse } from '../check.core.ts';

const RULE = 'validation-runs-as-its-agent';
const VALIDATOR_BY_SKILL = new Map([
  ['technical-validation', 'technical-validator'],
  ['visual-validation', 'visual-validator'],
]);

export const validationRunsAsItsAgent: Check = {
  name: RULE,
  tools: /^Skill$/u,
  run(input) {
    const requested = input.tool_input?.['skill'];
    const skill = typeof requested === 'string' ? requested : '';
    const validator = VALIDATOR_BY_SKILL.get(skill);
    const isSubagent = input.agent_id !== undefined && input.agent_id !== '';
    if (validator === undefined || !isSubagent) return PASS;
    return refuse(
      RULE,
      `a subagent loaded /${skill}, which needs the Agent tool it does not have`,
      [
        `/${skill} dispatches the isolated ${validator} agent, and a subagent has no Agent tool.`,
        'Validating here would run the review in a context that is not isolated.',
        'Stop, and return status blocked with next.kind escalate and reason validator-needs-dispatch.',
        `The main session then calls Agent with subagent_type "${validator}" and the brief from .claude/skills/${skill}/template.md.`,
      ],
    );
  },
};
