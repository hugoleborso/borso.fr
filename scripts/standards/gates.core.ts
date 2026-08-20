/**
 * The gates a standard may cite by name, and where each one claims to run.
 *
 * A standard used to say "CI runs a CDK synth" and "CI runs the mutation
 * gate", and CI did neither. Prose could say that because nothing read it.
 * Naming the gate and its sites here makes the claim a fact the ledger checks:
 * a gate whose token is absent from a site it names fails, in either
 * direction, so removing a step from CI breaks the standard that relies on it.
 *
 * `token` is the text that has to appear in the site file for the gate to be
 * running there. It is deliberately the command rather than a description,
 * because a comment mentioning a gate is not the gate.
 */

export interface GateDefinition {
  readonly name: string;
  /** Text that must appear in each site for the gate to count as running. */
  readonly token: string;
  /** Hook or workflow files the gate claims to run in. */
  readonly sites: readonly string[];
  readonly summary: string;
}

export const COMMIT_HOOK = '.husky/pre-commit';
export const PUSH_HOOK = '.husky/pre-push';
export const MESSAGE_HOOK = '.husky/commit-msg';
export const CONTINUOUS_INTEGRATION = '.github/workflows/ci.yml';
export const FULL_SUITE = '.github/workflows/full-suite.yml';

export const GATE_DEFINITIONS: readonly GateDefinition[] = [
  {
    name: 'eslint',
    token: 'eslint',
    sites: [COMMIT_HOOK, CONTINUOUS_INTEGRATION],
    summary: 'ESLint over the staged files on commit, and over the repository in CI',
  },
  {
    name: 'prettier',
    token: 'prettier',
    sites: [COMMIT_HOOK, CONTINUOUS_INTEGRATION],
    summary: 'Prettier formatting, on the staged files and again in CI',
  },
  {
    name: 'typecheck',
    token: 'typecheck',
    sites: [COMMIT_HOOK, CONTINUOUS_INTEGRATION],
    summary: '`tsc --noEmit` in every workspace, and over the tooling that belongs to none',
  },
  {
    name: 'vitest-coverage',
    token: 'test:coverage',
    sites: [CONTINUOUS_INTEGRATION, FULL_SUITE],
    summary: 'Vitest with the per-file coverage thresholds each workspace declares',
  },
  {
    name: 'vitest-back-e2e',
    token: '--project back-e2e',
    sites: [CONTINUOUS_INTEGRATION, FULL_SUITE],
    summary: 'the repository suites, against a real Postgres',
  },
  {
    name: 'stryker',
    token: 'stryker run',
    sites: [PUSH_HOOK, FULL_SUITE],
    summary: 'mutation testing, scoped to the changed pure files on push and unscoped on main',
  },
  {
    name: 'knip',
    token: 'exec knip',
    sites: [PUSH_HOOK, CONTINUOUS_INTEGRATION],
    summary: 'unused files, exports and dependencies',
  },
  {
    name: 'actionlint',
    token: 'actionlint',
    sites: [PUSH_HOOK],
    summary: 'the workflow files themselves',
  },
  {
    name: 'commitlint',
    token: 'commitlint',
    sites: [MESSAGE_HOOK],
    summary: 'conventional commits and the scope enumeration',
  },
  {
    name: 'eslint-rule-suites',
    token: 'test:eslint-rules',
    sites: [CONTINUOUS_INTEGRATION],
    summary: 'the RuleTester suite every custom rule ships with',
  },
];

export function findGate(name: string): GateDefinition | null {
  return GATE_DEFINITIONS.find((gate) => gate.name === name) ?? null;
}
