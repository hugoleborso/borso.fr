export interface GateDefinition {
  readonly name: string;
  readonly siteMustContain: string;
  readonly sites: readonly string[];
  readonly summary: string;
}

export const COMMIT_HOOK = '.husky/pre-commit';
export const PUSH_HOOK = '.husky/pre-push';
export const MESSAGE_HOOK = '.husky/commit-msg';
export const CONTINUOUS_INTEGRATION = '.github/workflows/ci.yml';
export const FULL_SUITE = '.github/workflows/full-suite.yml';
export const PRODUCTION_DEPLOY = '.github/workflows/deploy.yml';

export const GATE_DEFINITIONS: readonly GateDefinition[] = [
  {
    name: 'oxlint',
    siteMustContain: 'oxlint',
    sites: [COMMIT_HOOK, PUSH_HOOK, CONTINUOUS_INTEGRATION],
    summary:
      'oxlint over the staged files, then with the type-aware rules over the files a push changes and over the repository in CI',
  },
  {
    name: 'oxfmt',
    siteMustContain: 'oxfmt',
    sites: [COMMIT_HOOK, CONTINUOUS_INTEGRATION],
    summary: 'oxfmt formatting, on the staged files and again in CI',
  },
  {
    name: 'typecheck',
    siteMustContain: 'typecheck',
    sites: [PUSH_HOOK, CONTINUOUS_INTEGRATION],
    summary: '`tsc --noEmit` in every workspace, and over the tooling that belongs to none',
  },
  {
    name: 'vitest-coverage',
    siteMustContain: 'test:coverage',
    sites: [CONTINUOUS_INTEGRATION, FULL_SUITE],
    summary: 'Vitest with the per-file coverage thresholds each workspace declares',
  },
  {
    name: 'vitest-back-e2e',
    siteMustContain: '--project back-e2e',
    sites: [CONTINUOUS_INTEGRATION, FULL_SUITE],
    summary: 'the repository suites, against a real Postgres',
  },
  {
    name: 'stryker',
    siteMustContain: 'stryker run',
    sites: [PUSH_HOOK, FULL_SUITE],
    summary: 'mutation testing, scoped to the changed pure files on push and unscoped on main',
  },
  {
    name: 'knip',
    siteMustContain: 'exec knip',
    sites: [PUSH_HOOK, CONTINUOUS_INTEGRATION],
    summary: 'unused files, exports and dependencies',
  },
  {
    name: 'actionlint',
    siteMustContain: 'actionlint',
    sites: [PUSH_HOOK],
    summary: 'the workflow files themselves',
  },
  {
    name: 'commitlint',
    siteMustContain: 'commitlint',
    sites: [MESSAGE_HOOK],
    summary: 'conventional commits and the scope enumeration',
  },
  {
    name: 'deploy-smoke-agent-reader',
    siteMustContain: 'smoke-agent-reader.sh',
    sites: [PRODUCTION_DEPLOY],
    summary:
      'one invocation of each reader Lambda after its production deploy, the only gate here that reaches a real DSQL cluster',
  },
  {
    name: 'eslint-rule-suites',
    siteMustContain: 'test:eslint-rules',
    sites: [CONTINUOUS_INTEGRATION],
    summary: 'the RuleTester suite every custom rule ships with',
  },
];

export function findGate(name: string): GateDefinition | null {
  return GATE_DEFINITIONS.find((gate) => gate.name === name) ?? null;
}
