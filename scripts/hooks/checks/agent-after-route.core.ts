// @FollowsBlueprint utils-pure-module
import {
  type Check,
  type HookInput,
  type HookWorld,
  PASS,
  refuse,
  type Verdict,
} from '../check.core.ts';

const READ_ONLY_AGENT_TYPES = new Set([
  'Explore',
  'Plan',
  'claude-code-guide',
  'web-fetch',
  'technical-validator',
  'visual-validator',
  'statusline-setup',
  'impeccable-finish-reviewer',
]);

const FRAMING_SKILL_IN_TRANSCRIPT =
  /"skill": ?"(route|specification|tech-lead-orchestrator|feature-pipeline|after-task-kaizen)"|<command-name>\/(route|specification|tech-lead-orchestrator|feature-pipeline|after-task-kaizen)<\/command-name>/u;

const ADDED_SPEC_PATTERN = 'docs/features/*/*/spec/spec.md';

function readAgentType(input: HookInput): string {
  const agentType = input.tool_input?.['subagent_type'];
  return typeof agentType === 'string' ? agentType : 'general-purpose';
}

function hasRunFramingSkill(input: HookInput, world: HookWorld): boolean {
  if (input.transcript_path === undefined || input.transcript_path === '') return false;
  // Stryker disable next-line StringLiteral: equivalent mutant, an unreadable transcript stands in as text the framing pattern never matches, and Stryker's placeholder text matches it no more than the empty string does.
  return FRAMING_SKILL_IN_TRANSCRIPT.test(world.readText(input.transcript_path) ?? '');
}

function hasBranchAddedSpec(world: HookWorld): boolean {
  const { stdout } = world.run('git', [
    '-C',
    world.projectDirectory,
    'diff',
    '--name-only',
    '--diff-filter=A',
    'origin/main...HEAD',
    '--',
    ADDED_SPEC_PATTERN,
  ]);
  return stdout.trim() !== '';
}

const AGENT_TOOL = /^(Agent|Task)$/u;
const APP_FILE = /^apps\//u;

function readEditedAppFile(input: HookInput, world: HookWorld): string | null {
  const path = input.tool_input?.['file_path'] ?? input.tool_input?.['notebook_path'];
  if (typeof path !== 'string') return null;
  const projectPrefix = `${world.projectDirectory}/`;
  const relative = path.startsWith(projectPrefix) ? path.slice(projectPrefix.length) : path;
  return APP_FILE.test(relative) ? relative : null;
}

function isFramed(input: HookInput, world: HookWorld): boolean {
  return hasRunFramingSkill(input, world) || hasBranchAddedSpec(world);
}

function checkAgent(input: HookInput, world: HookWorld): Verdict {
  const agentType = readAgentType(input);
  if (READ_ONLY_AGENT_TYPES.has(agentType) || isFramed(input, world)) return PASS;
  return refuse('agent-after-route', `a ${agentType} agent was spawned before /route ran`, [
    'This session has not run /route, and its branch adds no spec.md.',
    `A ${agentType} agent can write code, so size the work first: run /route.`,
    'A Tier 2 feature shows the operator mockups and a spec before any build agent starts.',
  ]);
}

function checkEdit(input: HookInput, world: HookWorld): Verdict {
  const appFile = readEditedAppFile(input, world);
  if (appFile === null || isFramed(input, world)) return PASS;
  return refuse('agent-after-route', `${appFile} was edited before /route ran`, [
    'This session has not run /route, and its branch adds no spec.md.',
    'Size the work before the first change to an app: run /route. A one-file fix comes back Tier 0.',
    'A Tier 2 feature shows the operator mockups and a spec before any code.',
  ]);
}

export const agentAfterRoute: Check = {
  name: 'agent-after-route',
  tools: /^(Agent|Task|Write|Edit|MultiEdit|NotebookEdit)$/u,
  run: (input, world) => {
    if (input.agent_id !== undefined && input.agent_id !== '') return PASS;
    return AGENT_TOOL.test(String(input.tool_name))
      ? checkAgent(input, world)
      : checkEdit(input, world);
  },
};
