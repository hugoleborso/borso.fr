// @FollowsBlueprint utils-pure-module
import { type Check, type HookInput, type HookWorld, PASS, refuse } from '../check.core.ts';

const FRAMING_SKILL_IN_TRANSCRIPT =
  /"skill": ?"(route|specification|tech-lead-orchestrator|feature-pipeline|after-task-kaizen)"|<command-name>\/(route|specification|tech-lead-orchestrator|feature-pipeline|after-task-kaizen)<\/command-name>/u;

const ADDED_SPEC_PATTERN = 'docs/features/*/*/spec/spec.md';

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

const CHANGED_PATH = /^.. (.+)$/mu;

function readChangedAppFile(world: HookWorld): string | null {
  const { stdout } = world.run('git', [
    '-C',
    world.projectDirectory,
    'status',
    '--porcelain',
    '--',
    'apps/',
  ]);
  return CHANGED_PATH.exec(stdout)?.[1] ?? null;
}

export const agentAfterRoute: Check = {
  name: 'agent-after-route',
  tools: /^(Bash|Write|Edit|MultiEdit)$/u,
  run: (input, world) => {
    const appFile = readChangedAppFile(world);
    if (appFile === null || hasRunFramingSkill(input, world) || hasBranchAddedSpec(world)) {
      return PASS;
    }
    return refuse('agent-after-route', `${appFile} changed before /route ran`, [
      'This session has not run /route, and its branch adds no spec.md.',
      'Size the work before the first change to an app: run /route. A one-file fix comes back Tier 0.',
      'A Tier 2 feature shows the operator mockups and a spec before any code.',
    ]);
  },
};
