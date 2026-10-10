import type { CommandCanary, LintCanary } from './canaries.core';

export const MECHANISMS_THAT_GATE_NOTHING: ReadonlyMap<string, string> = new Map([
  ['scripts/check-branch-context.sh', 'prints a warning at SessionStart and always exits 0'],
  [
    'scripts/standards/rule-provenance.ts',
    'docs/standards/12-linting-and-gates.md says it gates nothing: it records which rules came from a defect',
  ],
]);

const FRONT_END_APPLICATIONS = ['borso-fr', 'borsouvertures'] as const;
const FULL_STACK_APPLICATIONS = ['banana-rush', 'last-loop-lepin', 'pragma', 'talos'] as const;
const APPLICATIONS = [...FRONT_END_APPLICATIONS, ...FULL_STACK_APPLICATIONS].sort();
const APPLICATIONS_WITH_PARITY_TESTS = ['borso-fr', 'borsouvertures', 'last-loop-lepin', 'pragma'];
const APPLICATIONS_WITH_AUDITED_MIGRATIONS = ['last-loop-lepin', 'pragma', 'talos'];

const SITE_LIBRARY = 'site/src/lib';
const DOCUMENTS = 'docs';
const CANARY_SITE_FILE = 'apps/pragma/site/src/lib/gate-canary-planted.ts';
const CANARY_SITE_COMPONENT = 'apps/pragma/site/src/components/atoms/GateCanary.tsx';

const SCRIPT = (name: string): readonly string[] => [`scripts/${name}`];
const TSX = (path: string, ...flags: readonly string[]): readonly string[] => [
  'pnpm',
  'exec',
  'tsx',
  path,
  ...flags,
];
const IN_SHELL = (command: string): readonly string[] => ['bash', '-c', command];

function workspaceFilter(application: string): string {
  return `@borso-app/${application}`;
}

function readDatabaseUrlThen(application: string, command: string): readonly string[] {
  const database = application.replaceAll('-', '_');
  return IN_SHELL(
    [
      `cd apps/${application}`,
      `if [ -n "\${GATE_CANARY_POSTGRES:-}" ]; then DATABASE_URL="$GATE_CANARY_POSTGRES/${database}"; else DATABASE_URL="$(../../scripts/local-postgres.sh start ${application})"; fi`,
      `DATABASE_URL="$DATABASE_URL" ${command}`,
    ].join(' && '),
  );
}

const PARTLY_COVERED_SOURCE = `export function classifyGateCanary(value: number): string {
  if (value > 1) return 'large';
  return 'small';
}
`;

const PARTLY_COVERING_TEST = (
  moduleName: string,
): string => `import { describe, expect, it } from 'vitest';
import { classifyGateCanary } from './${moduleName}';

describe('classifyGateCanary', () => {
  it('names a large value', () => {
    expect(classifyGateCanary(2)).toBe('large');
  });
});
`;

const WEAKLY_TESTED_SOURCE = `export function addGateCanaryMargin(value: number): number {
  return value + 1;
}
`;

const WEAKLY_ASSERTING_TEST = (
  moduleName: string,
): string => `import { describe, expect, it } from 'vitest';
import { addGateCanaryMargin } from './${moduleName}';

describe('addGateCanaryMargin', () => {
  it('returns a number', () => {
    expect(typeof addGateCanaryMargin(1)).toBe('number');
  });
});
`;

const COVERAGE_REFUSAL = /does not meet[^\n]*gate-canary-coverage/;
const MUTATION_REFUSAL = /Survived[\s\S]*gate-canary-mutation\.utils\.ts/;

interface PureFilePlacement {
  readonly label: string;
  readonly directory: string;
  readonly testDirectory: string;
  readonly command: (testPath: string) => readonly string[];
}

const COVERAGE_PLACEMENTS: readonly PureFilePlacement[] = [
  ...FRONT_END_APPLICATIONS.map((application) => ({
    label: application,
    directory: `apps/${application}/${SITE_LIBRARY}`,
    testDirectory: `apps/${application}/${SITE_LIBRARY}`,
    command: (testPath: string) => [
      'pnpm',
      '--filter',
      workspaceFilter(application),
      'run',
      'test:coverage',
      testPath.replace(`apps/${application}/`, ''),
    ],
  })),
  ...FULL_STACK_APPLICATIONS.map((application) => ({
    label: application,
    directory: `apps/${application}/${SITE_LIBRARY}`,
    testDirectory: `apps/${application}/${SITE_LIBRARY}`,
    command: (testPath: string) => [
      'pnpm',
      '--filter',
      workspaceFilter(application),
      'run',
      'test:core',
      testPath.replace(`apps/${application}/`, ''),
    ],
  })),
  {
    label: 'infra/cdk',
    directory: 'infra/cdk/src',
    testDirectory: 'infra/cdk/src',
    command: (testPath: string) => [
      'pnpm',
      '--filter',
      '@borso/infra',
      'run',
      'test:coverage',
      testPath.replace('infra/cdk/', ''),
    ],
  },
  {
    label: 'tooling',
    directory: 'scripts/gate-canary',
    testDirectory: 'scripts/gate-canary',
    command: (testPath: string) => ['pnpm', 'run', 'test:coverage', testPath],
  },
];

function coverageCanary(placement: PureFilePlacement): CommandCanary {
  const source = `${placement.directory}/gate-canary-coverage.utils.ts`;
  const test = `${placement.testDirectory}/gate-canary-coverage.utils.test.ts`;
  return {
    mechanism: 'vitest-coverage',
    label: `coverage threshold in ${placement.label}`,
    defect: 'a pure file whose test reaches one of its two branches',
    plant: {
      [source]: PARTLY_COVERED_SOURCE,
      [test]: PARTLY_COVERING_TEST('gate-canary-coverage.utils'),
    },
    command: placement.command(test),
    refusal: COVERAGE_REFUSAL,
    tier: 'slow',
  };
}

const SHARED_INFRA_COVERAGE_CANARY: CommandCanary = {
  mechanism: 'vitest-coverage',
  label: 'coverage threshold in infra/shared',
  defect: 'a library file whose test reaches one of its two branches',
  plant: {
    'infra/shared/lib/gate-canary-coverage.ts': PARTLY_COVERED_SOURCE,
    'infra/shared/test/unit/gate-canary-coverage.test.ts': PARTLY_COVERING_TEST(
      '../../lib/gate-canary-coverage',
    ),
  },
  command: [
    'pnpm',
    '--filter',
    '@borso/shared-infra',
    'run',
    'test:coverage',
    'test/unit/gate-canary-coverage.test.ts',
  ],
  refusal: COVERAGE_REFUSAL,
  tier: 'slow',
};

const MUTATION_PLACEMENTS: readonly {
  readonly label: string;
  readonly directory: string;
  readonly command: (sourcePath: string) => readonly string[];
}[] = [
  ...APPLICATIONS.map((application) => ({
    label: application,
    directory: `apps/${application}/${SITE_LIBRARY}`,
    command: (sourcePath: string) => [
      'pnpm',
      '--filter',
      workspaceFilter(application),
      'exec',
      'stryker',
      'run',
      '--mutate',
      sourcePath.replace(`apps/${application}/`, ''),
    ],
  })),
  {
    label: 'infra/cdk',
    directory: 'infra/cdk/src',
    command: (sourcePath: string) => [
      'pnpm',
      '--filter',
      '@borso/infra',
      'exec',
      'stryker',
      'run',
      '--mutate',
      sourcePath.replace('infra/cdk/', ''),
    ],
  },
  {
    label: 'tooling',
    directory: 'scripts/gate-canary',
    command: (sourcePath: string) => ['pnpm', 'exec', 'stryker', 'run', '--mutate', sourcePath],
  },
];

const MUTATION_CANARIES: readonly CommandCanary[] = MUTATION_PLACEMENTS.map((placement) => {
  const source = `${placement.directory}/gate-canary-mutation.utils.ts`;
  return {
    mechanism: 'stryker',
    label: `mutation score in ${placement.label}`,
    defect: 'a pure file whose test runs it and asserts nothing about the result',
    plant: {
      [source]: WEAKLY_TESTED_SOURCE,
      [`${placement.directory}/gate-canary-mutation.utils.test.ts`]: WEAKLY_ASSERTING_TEST(
        'gate-canary-mutation.utils',
      ),
    },
    command: placement.command(source),
    refusal: MUTATION_REFUSAL,
    tier: 'slow',
  };
});

const UNKNOWN_TRANSLATION_KEY_COMPONENT = `import { useTranslation } from 'react-i18next';

export function GateCanaryLabel(): string {
  const { t } = useTranslation();
  return t('gate-canary.a-key-no-catalogue-holds');
}
`;

const TRANSLATION_KEY_CANARIES: readonly CommandCanary[] = APPLICATIONS.map((application) => ({
  mechanism: 'react-i18next.d.ts',
  label: `translation keys typed in ${application}`,
  defect: 'a component asking for a translation key no catalogue holds',
  plant: {
    [`apps/${application}/site/src/components/atoms/GateCanaryLabel.tsx`]:
      UNKNOWN_TRANSLATION_KEY_COMPONENT,
  },
  command: ['pnpm', '--filter', workspaceFilter(application), 'run', 'typecheck'],
  refusal: /GateCanaryLabel\.tsx[^\n]*gate-canary\.a-key-no-catalogue-holds/,
  tier: 'slow',
}));

const TYPE_ERROR_REFUSAL = /gate-canary-typecheck\.ts[^\n]*TS2322/;
const TYPE_ERROR = `export const gateCanaryCount: number = 'not a number';\n`;

const TYPECHECK_CANARIES: readonly CommandCanary[] = [
  {
    mechanism: 'typecheck',
    label: 'typecheck of the repository tooling',
    defect: 'a string assigned to a number in scripts/',
    plant: { 'scripts/gate-canary/gate-canary-typecheck.ts': TYPE_ERROR },
    command: ['pnpm', 'run', 'typecheck'],
    refusal: TYPE_ERROR_REFUSAL,
    tier: 'fast',
  },
  {
    mechanism: 'typecheck',
    label: 'typecheck of infra/cdk',
    defect: 'a string assigned to a number in a construct source',
    plant: { 'infra/cdk/src/gate-canary-typecheck.ts': TYPE_ERROR },
    command: ['pnpm', '--filter', '@borso/infra', 'run', 'typecheck'],
    refusal: TYPE_ERROR_REFUSAL,
    tier: 'slow',
  },
  {
    mechanism: 'typecheck',
    label: 'typecheck of infra/shared',
    defect: 'a string assigned to a number in a shared stack source',
    plant: { 'infra/shared/lib/gate-canary-typecheck.ts': TYPE_ERROR },
    command: ['pnpm', '--filter', '@borso/shared-infra', 'run', 'typecheck'],
    refusal: TYPE_ERROR_REFUSAL,
    tier: 'slow',
  },
  {
    mechanism: 'typecheck',
    label: 'typecheck of the pragma CDK application',
    defect: 'a string assigned to a number in cdk/',
    plant: { 'apps/pragma/cdk/lib/gate-canary-typecheck.ts': TYPE_ERROR },
    command: ['pnpm', '--filter', workspaceFilter('pragma'), 'run', 'typecheck'],
    refusal: TYPE_ERROR_REFUSAL,
    tier: 'slow',
  },
];

const PARITY_CANARIES: readonly CommandCanary[] = APPLICATIONS_WITH_PARITY_TESTS.map(
  (application) => ({
    mechanism: 'i18n-parity.core.test.ts',
    label: `catalogue parity in ${application}`,
    defect: 'a key present in the English catalogue and missing from the French one',
    edits: [
      {
        path: `apps/${application}/site/src/i18n/en.json`,
        find: '{',
        replace: '{\n  "gate-canary-only-in-english": "Only in English",',
      },
    ],
    command: IN_SHELL(
      `cd apps/${application} && pnpm exec vitest run ${
        application === 'pragma' || application === 'last-loop-lepin' ? '--project core ' : ''
      }site/src/i18n/i18n-parity.core.test.ts`,
    ),
    refusal: /gate-canary-only-in-english/,
    tier: 'fast',
  }),
);

const AUDIT_CANARIES: readonly CommandCanary[] = APPLICATIONS_WITH_AUDITED_MIGRATIONS.map(
  (application) => ({
    mechanism: 'migrations.audit.test.ts',
    label: `migration audit in ${application}`,
    defect: 'a migration giving a business column DEFAULT now()',
    plant: {
      [`apps/${application}/api/src/database/migrations/9999_gate_canary.sql`]:
        'CREATE TABLE IF NOT EXISTS "gate_canary" (\n  "id" text PRIMARY KEY,\n  "started_at" timestamptz DEFAULT now()\n);\n',
    },
    command: readDatabaseUrlThen(
      application,
      'pnpm exec vitest run api/src/database/migrations.audit.test.ts',
    ),
    refusal: /gate_canary/,
    tier: 'slow',
  }),
);

const FAILING_REPOSITORY_TEST = `import { describe, expect, it } from 'vitest';

describe('gate canary repository', () => {
  it('fails on purpose', () => {
    expect('gate-canary-planted-failure').toBe('a value the repository never returns');
  });
});
`;

const BACK_END_SUITE_CANARIES: readonly CommandCanary[] = FULL_STACK_APPLICATIONS.map(
  (application) => ({
    mechanism: 'vitest-back-e2e',
    label: `back-e2e suite in ${application}`,
    defect: 'a repository test that fails',
    plant: {
      [`apps/${application}/api/src/gate-canary/gate-canary.repository.test.ts`]:
        FAILING_REPOSITORY_TEST,
    },
    command: readDatabaseUrlThen(
      application,
      'pnpm exec vitest run --project back-e2e api/src/gate-canary/gate-canary.repository.test.ts',
    ),
    refusal: /gate-canary-planted-failure/,
    tier: 'slow',
  }),
);

const LINT_GATE_CANARIES: readonly CommandCanary[] = [
  {
    mechanism: 'eslint',
    label: 'ESLint on staged files, as pre-commit runs it',
    defect: 'a warning-severity violation, which only --max-warnings 0 turns into a failure',
    plant: {
      [CANARY_SITE_COMPONENT]: `import { useMemo } from 'react';

export function GateCanary({ price, count }: { readonly price: number; readonly count: number }) {
  const total = useMemo(() => price * count, [price]);
  return <span>{total}</span>;
}
`,
    },
    command: [
      'pnpm',
      'exec',
      'eslint',
      '--no-warn-ignored',
      '--max-warnings',
      '0',
      CANARY_SITE_COMPONENT,
    ],
    refusal: /react-hooks\/exhaustive-deps/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/lint-repository.sh',
    label: 'ESLint over the repository, as CI runs it',
    defect: 'an explicit any in the tooling outside every workspace',
    plant: {
      'scripts/gate-canary/gate-canary-lint.ts':
        'export function readGateCanary(input: any): string {\n  return String(input);\n}\n',
    },
    command: SCRIPT('lint-repository.sh'),
    refusal: /gate-canary-lint\.ts/,
    tier: 'slow',
  },
  {
    mechanism: 'eslint-rule-suites',
    label: 'RuleTester suite of a disarmed rule',
    defect: 'a custom rule whose report call was deleted',
    edits: [
      {
        path: 'eslint-rules/no-api-anchor-in-site.js',
        find: "context.report({ node: value, messageId: 'apiAnchor' });",
        replace: '',
      },
    ],
    command: ['pnpm', 'run', 'test:eslint-rules', 'eslint-rules/no-api-anchor-in-site.test.js'],
    refusal: /no-api-anchor-in-site/,
    tier: 'fast',
  },
  {
    mechanism: 'prettier',
    label: 'Prettier over the repository, as CI runs it',
    defect: 'a misformatted source file',
    plant: {
      'scripts/gate-canary/gate-canary-format.ts': 'export const gateCanary   =   [1,2,3]\n',
    },
    command: ['pnpm', 'run', 'format:check'],
    refusal: /gate-canary-format\.ts/,
    tier: 'fast',
  },
  {
    mechanism: 'knip',
    label: 'knip over the workspace',
    defect: 'a module nothing imports',
    plant: {
      'apps/pragma/site/src/lib/gate-canary-unused.ts': 'export const gateCanaryUnused = 1;\n',
    },
    command: ['pnpm', 'exec', 'knip'],
    refusal: /gate-canary-unused\.ts/,
    tier: 'slow',
  },
  {
    mechanism: 'actionlint',
    label: 'actionlint over the workflows',
    defect: 'a workflow job with a misspelt key',
    plant: {
      '.github/workflows/gate-canary.yml':
        'name: gate-canary\non: push\njobs:\n  canary:\n    runs-on: ubuntu-latest\n    stepz:\n      - run: echo canary\n',
    },
    command: ['actionlint'],
    refusal: /gate-canary\.yml/,
    tier: 'fast',
  },
  {
    mechanism: 'commitlint',
    label: 'commitlint on a message, as commit-msg runs it',
    defect: 'a commit message with no type and no scope',
    plant: { 'gate-canary-commit-message.txt': 'fixed some stuff\n' },
    command: ['pnpm', 'exec', 'commitlint', '--edit', 'gate-canary-commit-message.txt'],
    refusal: /type may not be empty/,
    tier: 'fast',
  },
];

const STANDARD_WITH_A_FICTIONAL_RULE = {
  path: 'docs/standards/00-principles.md',
  find: '## Enforced by\n\n',
  replace: '## Enforced by\n\n- `eslint:borso/gate-canary-rule` is a rule nobody wrote.\n',
};

const GENERATOR_CANARIES: readonly CommandCanary[] = [
  {
    mechanism: 'scripts/standards/enforcement-ledger.ts',
    label: 'enforcement ledger',
    defect: 'a standard citing a rule that does not exist',
    edits: [STANDARD_WITH_A_FICTIONAL_RULE],
    command: TSX('scripts/standards/enforcement-ledger.ts', '--check'),
    refusal: /gate-canary-rule/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/standards/convention-drift.ts',
    label: 'convention drift ratchet',
    defect: 'a pragma source file whose name carries no layer suffix',
    plant: { [CANARY_SITE_FILE]: 'export const gateCanaryPlanted = 1;\n' },
    stage: true,
    command: TSX('scripts/standards/convention-drift.ts', '--check'),
    refusal: /layer-marker:pragma/,
    tier: 'fast',
  },
  {
    mechanism: '.claude/skills/blueprint/blueprint-indexing.ts',
    label: 'blueprint index',
    defect: 'a follower naming a blueprint that does not exist',
    plant: {
      'apps/pragma/site/src/lib/gate-canary-follower.utils.ts':
        '// @FollowsBlueprint gate-canary-no-such-blueprint\nexport function readGateCanary(): number {\n  return 1;\n}\n',
    },
    command: TSX('.claude/skills/blueprint/blueprint-indexing.ts', '--check'),
    refusal: /gate-canary-no-such-blueprint/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/blueprints/blueprint-defects.ts',
    label: 'blueprint defect page',
    defect: 'a dantotsu blaming a blueprint that does not exist',
    plant: {
      [`${DOCUMENTS}/dantotsus/gate-canary-defect.md`]:
        '---\ndate: 2026-10-10\nblueprints: [gate-canary-no-such-blueprint]\n---\n\n# Gate canary\n',
    },
    command: TSX('scripts/blueprints/blueprint-defects.ts', '--check'),
    refusal: /gate-canary-no-such-blueprint/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/architecture/architecture-graph.ts',
    label: 'architecture maps',
    defect: 'a file depending on an external system no manifest declares',
    plant: {
      'apps/pragma/api/src/songs/gate-canary.adapter.ts':
        '/** @DependsOnExternal gate-canary-system */\nexport function readGateCanary(): number {\n  return 1;\n}\n',
    },
    command: TSX('scripts/architecture/architecture-graph.ts', '--check'),
    refusal: /gate-canary-system/,
    tier: 'fast',
  },
];

const SCRIPT_CANARIES: readonly CommandCanary[] = [
  {
    mechanism: 'scripts/standards/gate-canaries.ts',
    label: 'every gate has a canary',
    defect: 'a new check script nobody planted a defect for',
    plant: { 'scripts/check-gate-canary-orphan.sh': '#!/usr/bin/env bash\nexit 0\n' },
    stage: true,
    command: TSX('scripts/standards/gate-canaries.ts', '--inventory'),
    refusal: /no canary: script scripts\/check-gate-canary-orphan\.sh/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-adr-numbers-resolve.sh',
    label: 'ADR numbers resolve',
    defect: 'an ADR whose heading states a different number from its filename',
    plant: { [`${DOCUMENTS}/adr/9999-gate-canary.md`]: '# ADR 9998 — gate canary\n' },
    command: SCRIPT('check-adr-numbers-resolve.sh'),
    refusal: /9999-gate-canary\.md/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-app-registration.sh',
    label: 'application registration',
    defect: 'an application with no path filter and no commit scope',
    plant: { 'apps/gate-canary/package.json': '{ "name": "@borso-app/gate-canary" }\n' },
    command: SCRIPT('check-app-registration.sh'),
    refusal: /gate-canary has no filter/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-coupled-lists.sh',
    label: 'coupled lists',
    defect: 'a knowledge entry the index does not link',
    plant: { [`${DOCUMENTS}/knowledge/gate-canary-unindexed.md`]: '# Gate canary\n' },
    command: SCRIPT('check-coupled-lists.sh'),
    refusal: /gate-canary-unindexed\.md/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-dated-records-are-append-only.sh',
    label: 'dated records',
    defect: 'an edit to a dated validation report',
    edits: [
      {
        path: 'docs/features/borso-fr/12-travaux/validation/technical-validation-2026-05-12-0028.md',
        find: '',
        replace: 'Gate canary edit.\n',
      },
    ],
    stage: true,
    command: SCRIPT('check-dated-records-are-append-only.sh'),
    refusal: /technical-validation-2026-05-12-0028\.md/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-every-test-is-collected.sh',
    label: 'every test is collected',
    defect: 'a test file outside every project include',
    plant: {
      'apps/borso-fr/site/gate-canary.test.ts':
        "import { expect, it } from 'vitest';\n\nit('is never collected', () => {\n  expect(true).toBe(true);\n});\n",
    },
    stage: true,
    command: SCRIPT('check-every-test-is-collected.sh'),
    refusal: /gate-canary\.test\.ts/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-frontend-env-vars.sh',
    label: 'front-end variables are wired',
    defect: 'a site reading a VITE_ variable no workflow sets',
    plant: {
      [CANARY_SITE_FILE]: 'export const gateCanaryPlanted = import.meta.env.VITE_GATE_CANARY;\n',
    },
    stage: true,
    command: SCRIPT('check-frontend-env-vars.sh'),
    refusal: /VITE_GATE_CANARY/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-gate-names-are-distinct.sh',
    label: 'gate names are distinct',
    defect: 'a second gate script whose name folds onto an existing one',
    plant: { 'scripts/check-distinct-names-gate-are.sh': '#!/usr/bin/env bash\nexit 0\n' },
    command: SCRIPT('check-gate-names-are-distinct.sh'),
    refusal: /check-distinct-names-gate-are\.sh/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-harness-links.sh',
    label: 'harness links',
    defect: 'a harness skill with no link in .claude/skills/',
    plant: {
      'plugins/borso-harness/skills/gate-canary/SKILL.md':
        '---\nname: gate-canary\ndescription: A skill nobody linked.\n---\n\n# Gate canary\n',
    },
    command: SCRIPT('check-harness-links.sh'),
    refusal: /gate-canary/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-hook-decisions.sh',
    label: 'hook decisions',
    defect: 'a refusing hook that lets every command through',
    edits: [
      {
        path: 'plugins/borso-harness/hooks/pretool-no-broad-kill.sh',
        find: '#!/usr/bin/env bash\n',
        replace: '#!/usr/bin/env bash\nexit 0\n',
      },
    ],
    command: SCRIPT('check-hook-decisions.sh'),
    refusal: /pretool-no-broad-kill\.sh should block/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-instructions-name-installed-tools.sh',
    label: 'instructions name installed tools',
    defect: 'an instruction telling an agent to run a tool that is not installed',
    plant: { '.claude/gate-canary.md': 'Run `pnpm exec gate-canary-tool` first.\n' },
    stage: true,
    command: SCRIPT('check-instructions-name-installed-tools.sh'),
    refusal: /gate-canary-tool/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-migration-sql-dsql-compat.sh',
    label: 'DSQL compatibility of migrations',
    defect: 'a migration adding a jsonb column',
    plant: {
      'apps/pragma/api/src/database/migrations/9998_gate_canary.sql':
        'ALTER TABLE song ADD COLUMN gate_canary jsonb;\n',
    },
    command: SCRIPT('check-migration-sql-dsql-compat.sh'),
    refusal: /9998_gate_canary\.sql/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-mutation-covers-gated-files.sh',
    label: 'every gated workspace is mutated',
    defect: 'a workspace with a pure file and no Stryker configuration',
    plant: {
      'apps/gate-canary/package.json': '{ "name": "@borso-app/gate-canary" }\n',
      'apps/gate-canary/site/src/gate-canary.core.ts': 'export const gateCanary = 1;\n',
    },
    command: SCRIPT('check-mutation-covers-gated-files.sh'),
    refusal: /apps\/gate-canary holds/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-named-paths-exist.sh',
    label: 'named paths exist',
    defect: 'a script citing a document that is not there',
    plant: {
      'scripts/gate-canary/cites.sh': `#!/usr/bin/env bash\n# See ${DOCUMENTS}/knowledge/gate-canary-missing.md.\n`,
    },
    stage: true,
    command: SCRIPT('check-named-paths-exist.sh'),
    refusal: /gate-canary-missing\.md/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-negative-claims-are-dated.sh',
    label: 'negative claims are dated',
    defect: 'a knowledge entry saying a tool does not work, with no date',
    plant: {
      [`${DOCUMENTS}/knowledge/gate-canary-claim.md`]:
        '# Gate canary\n\nThe canary tool does not work.\n',
    },
    command: SCRIPT('check-negative-claims-are-dated.sh'),
    refusal: /gate-canary-claim\.md/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-no-comments-in-styles-and-markup.sh',
    label: 'no comments in markup',
    defect: 'an HTML page carrying a comment',
    plant: {
      'apps/pragma/site/gate-canary.html': '<!doctype html>\n<!-- a comment -->\n<p></p>\n',
    },
    stage: true,
    command: SCRIPT('check-no-comments-in-styles-and-markup.sh'),
    refusal: /gate-canary\.html/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-no-null-bytes.sh',
    label: 'no NUL bytes',
    defect: 'a tracked text file carrying a NUL byte',
    plant: { 'docs/gate-canary-null.txt': 'before\0after\n' },
    stage: true,
    command: SCRIPT('check-no-null-bytes.sh'),
    refusal: /gate-canary-null\.txt/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-no-racy-pipelines.sh',
    label: 'no racy pipelines',
    defect: 'a pipefail script piping find into head',
    plant: {
      'scripts/gate-canary/racy.sh':
        '#!/usr/bin/env bash\nset -o pipefail\nfind . -name x | head -1\n',
    },
    stage: true,
    command: SCRIPT('check-no-racy-pipelines.sh'),
    refusal: /gate-canary\/racy\.sh/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-non-module-scripts.sh',
    label: 'module scripts only',
    defect: 'a page loading a script without type="module"',
    plant: {
      'apps/pragma/site/gate-canary.html':
        '<!doctype html>\n<script src="/gate-canary.js"></script>\n',
    },
    command: SCRIPT('check-non-module-scripts.sh'),
    refusal: /gate-canary\.js/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-numbered-sequences.sh',
    label: 'numbered sequences',
    defect: 'two ADRs claiming number 0001',
    plant: { [`${DOCUMENTS}/adr/0001-gate-canary.md`]: '# ADR 0001 — gate canary\n' },
    command: SCRIPT('check-numbered-sequences.sh'),
    refusal: /0001-gate-canary\.md/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-package-scripts-are-commands.sh',
    label: 'package scripts are commands',
    defect: 'a package script rewritten into a version string',
    plant: { 'tools/gate-canary/package.json': '{ "scripts": { "build": "1.2.3" } }\n' },
    stage: true,
    command: SCRIPT('check-package-scripts-are-commands.sh'),
    refusal: /gate-canary\/package\.json/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-pure-modules-have-callers.sh',
    label: 'pure modules have callers',
    defect: 'a pure module nothing calls',
    plant: {
      'apps/pragma/site/src/lib/gate-canary-orphan.utils.ts':
        'export const gateCanaryOrphan = 1;\n',
    },
    stage: true,
    command: SCRIPT('check-pure-modules-have-callers.sh'),
    refusal: /gate-canary-orphan\.utils\.ts/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-pwa-assets.sh',
    label: 'PWA icons ship',
    defect: 'a manifest naming an icon that is not there',
    edits: [
      {
        path: 'apps/pragma/site/public/manifest.webmanifest',
        find: '"icons": [',
        replace:
          '"icons": [{ "src": "/gate-canary-icon.png", "sizes": "192x192", "type": "image/png" },',
      },
    ],
    command: SCRIPT('check-pwa-assets.sh'),
    refusal: /gate-canary-icon\.png/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-single-stylesheet.sh',
    label: 'one stylesheet per application',
    defect: 'a second stylesheet in a site',
    plant: { 'apps/pragma/site/src/gate-canary.css': ':root {}\n' },
    stage: true,
    command: SCRIPT('check-single-stylesheet.sh'),
    refusal: /gate-canary\.css/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-spec-test-strategy.sh',
    label: 'specs name a test strategy',
    defect: 'a feature spec with no Test strategy section',
    plant: {
      [`${DOCUMENTS}/features/meta/gate-canary/spec/spec.md`]: '# Gate canary\n\n## Scope\n',
    },
    command: SCRIPT('check-spec-test-strategy.sh'),
    refusal: /gate-canary\/spec\/spec\.md/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-stylesheet-contents.sh',
    label: 'stylesheets hold tokens only',
    defect: 'a global class rule in the token stylesheet',
    edits: [
      {
        path: 'apps/pragma/site/src/styles/tokens.css',
        find: '',
        replace: '.gate-canary {\n  color: red;\n}\n',
      },
    ],
    command: SCRIPT('check-stylesheet-contents.sh'),
    refusal: /gate-canary/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-tailwind-arbitrary-variants.sh',
    label: 'Tailwind arbitrary variants',
    defect: 'an arbitrary variant opening on a bare word',
    plant: {
      'apps/pragma/site/src/lib/gate-canary-variant.ts':
        "export const gateCanaryClass = '[body.jumping&]:hidden';\n",
    },
    command: SCRIPT('check-tailwind-arbitrary-variants.sh'),
    refusal: /gate-canary-variant\.ts/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/check-vocabulary-paths.sh',
    label: 'vocabulary paths',
    defect: 'a vocabulary term naming a folder that is not there',
    edits: [
      {
        path: 'apps/pragma/VOCABULARY.md',
        find: '',
        replace: 'Lives in: `gate-canary-missing/`\n\n',
      },
    ],
    command: SCRIPT('check-vocabulary-paths.sh'),
    refusal: /gate-canary-missing/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/dependencies/check-dependency-catalog.ts',
    label: 'dependency catalog',
    defect: 'a workspace pinning a shared dependency outside the catalog',
    edits: [
      {
        path: 'apps/pragma/package.json',
        find: '"react": "catalog:"',
        replace: '"react": "18.0.0"',
      },
    ],
    command: TSX('scripts/dependencies/check-dependency-catalog.ts'),
    refusal: /react/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/docs/check-doc-links.ts',
    label: 'document links',
    defect: 'a document linking a file that is not there',
    plant: {
      [`${DOCUMENTS}/knowledge/gate-canary-links.md`]:
        '# Gate canary\n\nSee [nowhere](./gate-canary-nowhere.md).\n',
    },
    stage: true,
    command: TSX('scripts/docs/check-doc-links.ts'),
    refusal: /gate-canary-nowhere\.md/,
    tier: 'fast',
  },
  {
    mechanism: 'scripts/pr/check-pr-body.ts',
    label: 'pull-request body budget',
    defect: 'a template whose title is over budget',
    edits: [
      {
        path: 'plugins/borso-harness/skills/open-pr/template.md',
        find: '# A title that names what changed',
        replace:
          '# A title that names what changed and then keeps on going well past the budget a gate canary allows',
      },
    ],
    command: TSX('scripts/pr/check-pr-body.ts', 'plugins/borso-harness/skills/open-pr/template.md'),
    refusal: /Title/,
    tier: 'fast',
  },
];

export const LINT_CANARIES: readonly LintCanary[] = [
  {
    mechanism: 'borso/no-component-css-imports',
    label: 'a component importing its own stylesheet',
    path: CANARY_SITE_COMPONENT,
    code: "import './GateCanary.css';\n\nexport function GateCanary() {\n  return null;\n}\n",
  },
  {
    mechanism: '@eslint-community/eslint-comments/require-description',
    label: 'a disable comment with no reason',
    path: CANARY_SITE_FILE,
    code: '// eslint-disable-next-line no-magic-numbers\nexport const gateCanaryPlanted = 37;\n',
  },
  {
    mechanism: '@typescript-eslint/no-explicit-any',
    label: 'an explicit any',
    path: CANARY_SITE_FILE,
    code: 'export function readGateCanary(input: any): string {\n  return String(input);\n}\n',
  },
  {
    mechanism: '@typescript-eslint/no-unsafe-argument',
    label: 'an any passed as an argument',
    path: CANARY_SITE_FILE,
    code: 'export function readGateCanary(raw: string): number {\n  return Math.abs(JSON.parse(raw));\n}\n',
  },
  {
    mechanism: '@typescript-eslint/no-unsafe-assignment',
    label: 'an any assigned to a variable',
    path: CANARY_SITE_FILE,
    code: 'export function readGateCanary(raw: string): unknown {\n  const parsed = JSON.parse(raw);\n  return parsed;\n}\n',
  },
  {
    mechanism: 'no-magic-numbers',
    label: 'a bare number in a body',
    path: CANARY_SITE_FILE,
    code: 'export function scaleGateCanary(value: number): number {\n  return value * 37;\n}\n',
  },
  {
    mechanism: 'no-restricted-imports',
    label: 'a site importing the database driver',
    path: CANARY_SITE_FILE,
    code: "import { sql } from 'drizzle-orm/sql';\n\nexport const gateCanaryPlanted = sql;\n",
  },
  {
    mechanism: 'react-hooks/exhaustive-deps',
    label: 'a memo missing a dependency',
    path: CANARY_SITE_COMPONENT,
    code: "import { useMemo } from 'react';\n\nexport function GateCanary({ price, count }: { readonly price: number; readonly count: number }) {\n  const total = useMemo(() => price * count, [price]);\n  return <span>{total}</span>;\n}\n",
  },
  {
    mechanism: 'react-hooks/rules-of-hooks',
    label: 'a hook called under a condition',
    path: CANARY_SITE_COMPONENT,
    code: "import { useState } from 'react';\n\nexport function GateCanary({ isOpen }: { readonly isOpen: boolean }) {\n  if (isOpen) {\n    useState(0);\n  }\n  return null;\n}\n",
  },
  {
    mechanism: 'unicorn/catch-error-name',
    label: 'a caught error under another name',
    path: CANARY_SITE_FILE,
    code: 'export function readGateCanary(raw: string): unknown {\n  try {\n    return JSON.parse(raw);\n  } catch (exception) {\n    return exception;\n  }\n}\n',
  },
  {
    mechanism: 'unicorn/consistent-boolean-name',
    label: 'a boolean named like a noun',
    path: CANARY_SITE_FILE,
    code: 'export const gateCanaryVisibility = true;\n',
  },
  {
    mechanism: 'unicorn/consistent-function-scoping',
    label: 'a helper that closes over nothing, declared inside a function',
    path: CANARY_SITE_FILE,
    code: 'export function readGateCanary(values: readonly number[]): readonly number[] {\n  function doubleValue(value: number): number {\n    return value + value;\n  }\n  return values.map(doubleValue);\n}\n',
  },
];

export const COMMAND_CANARIES: readonly CommandCanary[] = [
  ...SCRIPT_CANARIES,
  ...GENERATOR_CANARIES,
  ...LINT_GATE_CANARIES,
  ...TYPECHECK_CANARIES,
  ...TRANSLATION_KEY_CANARIES,
  ...PARITY_CANARIES,
  ...COVERAGE_PLACEMENTS.map(coverageCanary),
  SHARED_INFRA_COVERAGE_CANARY,
  ...MUTATION_CANARIES,
  ...AUDIT_CANARIES,
  ...BACK_END_SUITE_CANARIES,
];
