import eslintComments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettierConfig from 'eslint-config-prettier/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { borsoPlugin } from './eslint-rules/index.js';

// Ported from biome.jsonc's `noExcessiveLinesPerFile`, whose ceiling was 300.
// See docs/knowledge/biome-formatter-trips-line-count-ceiling.md for why the
// formatter can push an untouched file over the line.
const MAXIMUM_LINES_PER_FILE = 300;

const TSCONFIG_PATHS = ['apps/*/tsconfig.json', 'infra/*/tsconfig.json', 'tsconfig.json'];

const TYPESCRIPT_FILES = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];

const UNPROJECTED_TYPESCRIPT_FILES = [
  'vitest.config.ts',
  '.claude/skills/**/*.ts',
  'apps/*/vitest.mutation.config.ts',
  'apps/*/bin/*.ts',
  'apps/*/scripts/*.ts',
  'apps/*/cdk/bin/*.ts',
  'apps/*/vitest.workspace.ts',
  'infra/*/vitest.config.ts',
  'infra/*/bin/*.ts',
];
// A workspace's own build and deploy tooling, as opposed to the code it ships.
const WORKSPACE_TOOLING_FILES = [
  'apps/*/*.config.ts',
  'apps/*/bin/**/*.ts',
  'apps/*/cdk/bin/**/*.ts',
  'apps/*/scripts/**/*.{ts,mjs}',
];

const SITE_FILES = ['apps/*/site/**/*.{ts,tsx}'];
const TEST_FILES = ['**/*.test.{ts,tsx,js}', '**/*.test-utils.ts', '**/test/**/*.ts'];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cdk.out/**',
      '**/coverage/**',
      '**/.reports/**',
      // Stryker copies the whole workspace into a sandbox per test runner. The
      // copies are gitignored, and linting them multiplies every finding by
      // the concurrency setting.
      '**/.stryker-tmp/**',
      '**/reports/mutation/**',
      '**/*.snap',
      'docs/**',
      'apps/*/api/src/database/migrations/**',
      'apps/*/site/public/**',
      'apps/*/site/openings/openings.json',
    ],
  },

  js.configs.recommended,
  eslintComments.recommended,

  // Type-aware linting for every TypeScript file in a workspace. The
  // `projectService` resolves each file through the nearest tsconfig, which is
  // what makes `no-unnecessary-condition` and the `no-unsafe-*` family work.
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: TYPESCRIPT_FILES,
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: TYPESCRIPT_FILES,
  })),
  {
    files: TYPESCRIPT_FILES,
    languageOptions: {
      parserOptions: {
        // Every workspace tsconfig lists its own config files in `include`,
        // so the project service resolves them. `allowDefaultProject` covers
        // only the loose files at the repository root, which belong to no
        // workspace.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Type-aware rules that need a setting to stay useful rather than noisy.
      // A number or a boolean inside a template literal is unambiguous, and
      // rejecting it produces `String(count)` calls that read worse.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      // The arrow shorthand `() => doSomething()` is idiomatic in a handler,
      // and forcing a block body around it adds two lines and no information.
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: true, ignoreVoidOperator: true },
      ],
      // `const { setlistId: _setlistId, ...rest } = variables` is how a key
      // gets dropped from an object, and the binding it needs is unused by
      // construction, so there is no version of that line the rule would
      // accept. Every other unused binding still fails.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },

  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // TypeScript files that belong to no workspace `tsconfig.json`. CDK entry
  // points under `bin/` are compiled by `tsconfig.cdk.json`, and the project
  // service only ever looks for the nearest `tsconfig.json`, so it cannot see
  // them. The syntactic rules still apply, and the type-aware ones are off.
  {
    files: UNPROJECTED_TYPESCRIPT_FILES,
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: { projectService: false, project: false, program: null },
    },
  },

  // The `borso` plugin holds every rule that encodes a decision in
  // docs/standards/, plus the rules that eradicate a recorded dantotsu.
  {
    plugins: { borso: borsoPlugin, 'import-x': importX },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ alwaysTryTypes: true, project: TSCONFIG_PATHS }),
      ],
    },
    rules: {
      'borso/no-type-assertion-except-unknown': 'error',
      'borso/no-inline-subscribe-in-use-sync-external-store': 'error',
      'borso/no-controller-imports-outside-service': 'error',

      // Ported from biome's `noExcessiveLinesPerFile`, which skips blank lines
      // and comment lines. Counting them here instead would fail twelve files
      // that biome passed, which would be a new rule rather than a port.
      'max-lines': [
        'error',
        { max: MAXIMUM_LINES_PER_FILE, skipBlankLines: true, skipComments: true },
      ],

      // Beyond what biome's recommended set covered.
      'import-x/no-cycle': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-duplicates': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-param-reassign': ['error', { props: true }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'object-shorthand': 'error',
      '@eslint-community/eslint-comments/require-description': [
        'error',
        { ignore: ['eslint-enable'] },
      ],
    },
  },

  // The two halves of docs/standards/02-purity-and-core-files.md. A branch
  // belongs in a pure function, and a pure function belongs in a file the
  // coverage and mutation gates cover.
  //
  // Scoped to application code. Repository tooling under `.claude/`, `scripts/`
  // and the root config files is exempt, because a build script is not a domain
  // rule and moving its branches into a `.core.ts` file would put tooling under
  // the coverage and mutation gates meant for the product.
  //
  // The same reason covers each workspace's own tooling, which the pattern
  // below could not tell from product code: `apps/*/vite.config.ts` holds a
  // workbox `urlPattern` callback, `apps/*/scripts/build-openings.ts` fetches
  // and reshapes a third party TSV at build time, and `apps/*/bin/app.ts` is a
  // CDK entry point. None of them ships to a user, and the vitest coverage
  // thresholds do not reach them.
  {
    files: ['apps/**/*.{ts,tsx}', 'infra/**/*.ts'],
    ignores: WORKSPACE_TOOLING_FILES,
    plugins: { borso: borsoPlugin },
    rules: {
      'borso/conditions-live-in-pure-functions': 'error',
      'borso/pure-functions-live-in-core-files': 'error',
      'borso/no-impure-calls-in-core-files': 'error',
    },
  },

  // Back end rules from standards 04 and 11. Scoped to `api/src`, because a
  // controller, a repository and a raw SQL tag only mean something there.
  {
    files: ['apps/*/api/src/**/*.ts'],
    plugins: { borso: borsoPlugin },
    rules: {
      'borso/no-array-methods-in-controllers': 'error',
      'borso/no-cross-slice-repository-imports': 'error',
      'borso/no-database-client-outside-repository': 'error',
      'borso/no-raw-sql-outside-migrations': 'error',
    },
  },

  // Front end rules from standards 05, 06, 07, 08 and 09.
  {
    files: SITE_FILES,
    plugins: { borso: borsoPlugin },
    rules: {
      'borso/no-use-effect': 'error',
      'borso/no-server-state-in-use-state': 'error',
      'borso/atomic-design-import-direction': 'error',
      'borso/no-flat-components-folder': 'error',
      'borso/no-query-hooks-outside-organisms': 'error',
      'borso/no-component-css-imports': 'error',
      'borso/no-literal-jsx-text': 'error',
      'borso/no-dynamic-translation-keys': 'error',
    },
  },

  // Only pragma uses Tailwind. The rule's reason is that Tailwind's scanner
  // never sees a class assembled at runtime, and that does not hold for the
  // three applications shipping plain CSS, where a concatenated class name
  // works correctly. Widen this as another application adopts Tailwind.
  {
    files: ['apps/pragma/site/**/*.{ts,tsx}'],
    plugins: { borso: borsoPlugin },
    rules: { 'borso/no-string-concatenated-class-names': 'error' },
  },

  // Naming and testing rules from standards 01 and 10, across all application
  // and infrastructure code.
  {
    files: ['apps/**/*.{ts,tsx}', 'infra/**/*.ts'],
    plugins: { borso: borsoPlugin },
    rules: {
      'borso/no-abbreviated-identifier': 'error',
      'borso/function-names-are-verb-phrases': 'error',
      'borso/no-french-identifiers': 'error',
      'borso/test-file-has-sibling-source': 'error',
    },
  },

  // `piece` in the chess application is the English chess term rather than the
  // French *pièce*, e.g. `onPieceDrop` and `isPromotionPiece`. The application
  // drops the word rather than the repository dropping the rule.
  {
    files: ['apps/borsouvertures/**/*.{ts,tsx}'],
    plugins: { borso: borsoPlugin },
    rules: {
      'borso/no-french-identifiers': ['error', { allowedWords: ['piece'] }],
    },
  },

  // Unicorn ships around a hundred rules in its recommended set, and most of
  // them are style choices with no standard behind them. Enabling the set
  // wholesale produced 2334 findings on this repository, of which the large
  // majority were renames that fight our own conventions, e.g. `Props` to
  // `Properties` and `utils` to `utilities`.
  //
  // So the rules below are an explicit list. Each one either enforces a rule
  // from docs/standards/, or it catches a defect class rather than a
  // preference. Adding a rule here means writing down which of the two it is.
  {
    plugins: { unicorn },
    rules: {
      // docs/standards/01-naming.md: a boolean name reads as a claim.
      'unicorn/consistent-boolean-name': 'error',
      // docs/standards/01-naming.md: `catch (error)`, never `catch (e)`.
      'unicorn/catch-error-name': 'error',
      // docs/standards/02-purity-and-core-files.md: a function that closes
      // over nothing is pure and belongs at module scope, where it can be
      // exported and tested.
      'unicorn/consistent-function-scoping': 'error',

      // Defect classes rather than preferences.
      'unicorn/require-array-sort-compare': 'error',
      'unicorn/error-message': 'error',
      'unicorn/throw-new-error': 'error',
      'unicorn/prefer-type-error': 'error',
      'unicorn/no-instanceof-builtins': 'error',
      'unicorn/no-invalid-remove-event-listener': 'error',
      'unicorn/no-useless-spread': 'error',
      'unicorn/no-useless-fallback-in-spread': 'error',
      'unicorn/no-array-push-push': 'error',
      'unicorn/no-thenable': 'error',
      'unicorn/no-unreadable-array-destructuring': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-date-now': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-set-has': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/explicit-length-check': 'error',
      'unicorn/no-lonely-if': 'error',
      'unicorn/no-negated-condition': 'error',
      'unicorn/prefer-early-return': 'error',
      'unicorn/no-top-level-assignment-in-function': 'error',
    },
  },

  // A client the process builds once, and a store React subscribes to, both
  // live in a module level binding a function assigns on first use. That is
  // the design of these files rather than an accident: a Lambda reuses its
  // database and S3 clients across warm invocations, `useSyncExternalStore`
  // needs its store outside React's tree, and the Postgres container is one
  // per test run. Every other module keeps the rule.
  {
    files: [
      'apps/*/api/src/database/client.ts',
      'apps/*/api/src/**/*.s3.ts',
      'apps/*/api/src/uploads/uploads.repository.ts',
      'apps/*/site/src/*-store.ts',
      'apps/*/test/**/*.ts',
    ],
    rules: { 'unicorn/no-top-level-assignment-in-function': 'off' },
  },

  // Plain browser scripts that ship as-is, with no bundler and no module
  // system, so they read the DOM globals directly.
  {
    files: ['apps/*/site/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser },
      sourceType: 'script',
    },
  },

  // Front end code. The site rules are scoped rather than global, because a
  // React rule firing on a Lambda handler is noise.
  {
    files: SITE_FILES,
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'borso/no-direct-api-fetch-in-site': 'error',
      'borso/no-api-anchor-in-site': 'error',
      'borso/no-circle-in-non-uniform-svg': 'error',
    },
  },

  {
    files: TEST_FILES,
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      // The CDK snapshot tests assert by calling into `assertions.Template`,
      // which throws on mismatch, so the assertion is real even though no
      // `expect` appears on the line.
      'vitest/expect-expect': [
        'error',
        {
          assertFunctionNames: [
            'expect',
            '**.hasResource',
            '**.hasResourceProperties',
            '**.resourceCountIs',
            '**.resourcePropertiesCountIs',
            '**.hasOutput',
            '**.findResources',
          ],
        },
      ],
      'vitest/no-identical-title': 'error',
      // Every finding was `delete process.env[NAME]` restoring an environment
      // variable a test had set. The rule's reason is that a record with
      // computed keys wants to be a `Map`, and `process.env` is not ours to
      // redesign, so there is no version of that line the rule would accept.
      '@typescript-eslint/no-dynamic-delete': 'off',
      // A test's `async` marks a contract rather than an awaited call: `await
      // act(async () => …)` takes React's asynchronous path only when the
      // callback returns a promise, a `fetch` stub has to return one, and a
      // Lambda handler fixture is async by its signature. Rewriting any of
      // them as `() => Promise.resolve(…)` satisfies the rule and reads worse.
      '@typescript-eslint/require-await': 'off',
      'max-lines': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  // CloudFront Function source. The file ships verbatim to the edge runtime,
  // which is stricter than the documentation implies, so it stays on ES5
  // syntax on purpose. Carried over from the biome overrides.
  {
    files: ['**/*.code.js'],
    rules: {
      'prefer-template': 'off',
      'no-var': 'off',
      'no-inner-declarations': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/prefer-optional-catch-binding': 'off',
    },
  },

  // Code a person runs from a terminal and reads the output of. `no-console`
  // exists to keep logging out of what ships, and none of these ship: a build
  // script prints its progress, and `main.dev.ts` prints the port the local
  // API bound to. The Lambda entry point is `main.ts`, which keeps the rule.
  {
    files: [
      'eslint-rules/**/*.js',
      'scripts/**/*.{js,mjs}',
      '*.config.{js,ts}',
      'apps/*/scripts/**/*.{ts,mjs}',
      'apps/*/api/src/main.dev.ts',
    ],
    rules: {
      'no-console': 'off',
      'max-lines': 'off',
    },
  },

  // Must stay last, so it can switch off every rule that fights the formatter.
  prettierConfig,
);
