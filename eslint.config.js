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
  'scripts/**/*.ts',
  'apps/*/vitest.mutation.config.ts',
  'apps/*/bin/*.ts',
  'apps/*/scripts/*.ts',
  'apps/*/cdk/bin/*.ts',
  'infra/*/vitest.config.ts',
  'infra/*/vitest.mutation.config.ts',
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

// The identity values docs/standards/01-naming.md exempts, plus the HTTP status
// codes. A status code is already a name in a published registry that every
// reader of an HTTP handler knows, so `HTTP_NOT_FOUND = 404` renames 404 to
// something no clearer than 404 itself, at every call site.
const IDENTITY_VALUES = [0, 1, -1];
const HTTP_STATUS_CODES = [
  200, 201, 204, 301, 302, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503,
];

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
      'apps/*/site/src/openings/openings.json',
    ],
  },

  js.configs.recommended,
  eslintComments.recommended,

  // An exception to a rule is a claim about this line, so it has to be written
  // down next to it and it has to stop applying once it stops being true.
  // `require-description` rejects a bare `eslint-disable`, and
  // `reportUnusedDisableDirectives` rejects one that no longer suppresses
  // anything, so a fixed violation cannot leave its excuse behind. Together
  // they are what replaced `eslint-suppressions.json`, a path-keyed file that
  // carried no reasons and went stale in silence. See
  // docs/standards/12-linting-and-gates.md.
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      '@eslint-community/eslint-comments/require-description': [
        'error',
        { ignore: ['eslint-enable'] },
      ],
    },
  },

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
      // The type-aware counterpart of `unicorn/require-array-sort-compare`,
      // which is purely syntactic and so cannot tell a numeric sort from a
      // string one. Every finding the unicorn rule produced here was a
      // `string[]`, where the default lexicographic order is the intended
      // one; adding `localeCompare` to satisfy it would have changed
      // migration file ordering, because that collation gives `-` and `_`
      // variable weight. This version defaults to `ignoreStringArrays: true`
      // and still catches the defect that matters, a bare `.sort()` on
      // `number[]`.
      '@typescript-eslint/require-array-sort-compare': 'error',
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
      // The rule guards against mutating an object the caller still owns. A DOM
      // node handed to a `querySelectorAll(...).forEach` callback has no such
      // caller, and writing `element.style.transform` is the whole of a
      // canvas animation, so parameters named for what they are are exempt.
      'no-param-reassign': [
        'error',
        { props: true, ignorePropertyModificationsForRegex: ['Element$', 'Node$'] },
      ],
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
      'borso/no-step-named-value': 'error',
    },
  },

  // ADR-0012: an outbound call lives in a `<domain>.adapter.ts`. Both sides of
  // an application, because a browser fetching a presigned URL and a Lambda
  // calling a web service are the same kind of edge on the same map.
  {
    // `SITE_FILES` rather than `site/src/**`: two of the four applications keep
    // their sources directly under `site/`, so the narrower glob matched no file
    // in either of them and both rules were silent on half the repository.
    // `domain/` is the third place: it holds the rules both sides read
    // (ADR-0010), its files are gated for coverage and mutation like any other
    // pure module, and it sits under neither `api/src` nor `site`.
    files: ['apps/*/api/src/**/*.ts', 'apps/*/domain/**/*.ts', ...SITE_FILES],
    plugins: { borso: borsoPlugin },
    rules: {
      'borso/no-outbound-call-outside-adapter': 'error',
      // The other direction of the same dependency. An adapter leaning on a
      // pure module is the pattern; a pure module leaning on an adapter is a
      // file that reaches the network while carrying the suffix that promises
      // it does not, and both pure gates would still pass because the test
      // stubs the adapter.
      'borso/no-adapter-import-in-pure-module': 'error',
    },
  },

  // Back end rules from standards 04 and 11. Scoped to `api/src`, because a
  // controller, a repository and a raw SQL tag only mean something there.
  {
    files: ['apps/*/api/src/**/*.ts'],
    plugins: { borso: borsoPlugin },
    rules: {
      'borso/no-array-methods-in-controllers': 'error',
      'borso/no-horizontal-folders-in-api': 'error',
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
      'borso/atomic-design-composition': 'error',
      'borso/atomic-design-import-direction': 'error',
      'borso/no-flat-components-folder': 'error',
      'borso/no-components-outside-buckets': 'error',
      'borso/no-query-hooks-outside-organisms': 'error',
      'borso/no-component-css-imports': 'error',
      'borso/no-vendor-sdk-outside-adapter': 'error',
      'borso/no-literal-jsx-text': 'error',
      'borso/no-dynamic-translation-keys': 'error',
      'borso/no-discarded-await-before-navigation': 'error',
    },
  },

  // Tailwind's scanner never sees a class assembled at runtime, so a
  // concatenated class name silently ships without its styles. Every
  // application is on Tailwind now, so the rule applies to all of them.
  {
    files: ['apps/*/site/**/*.{ts,tsx}'],
    plugins: { borso: borsoPlugin },
    rules: { 'borso/no-string-concatenated-class-names': 'error' },
  },

  // A folder both sides of an application read cannot import from either side,
  // and a pure file cannot import a vendor SDK.
  //
  // ADR-0010 justifies `apps/<app>/domain/` entirely on the claim that the API
  // and the site both read it. One `import { useState } from 'react'` ends that,
  // and until now nothing said so: the import rules here are all about direction
  // inside a side, and `no-restricted-imports` appeared nowhere in this file.
  //
  // A `.core.ts` is held to the same bar from the other direction. The purity
  // rules reject an impure *call*; they have nothing to say about importing a
  // client whose construction is the impurity.
  {
    files: ['apps/*/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'A domain rule both sides read cannot depend on React.' },
            { name: 'react-dom', message: 'A domain rule both sides read cannot depend on React.' },
            {
              name: 'hono',
              message: 'A domain rule both sides read cannot depend on the server framework.',
            },
            {
              name: 'drizzle-orm',
              message: 'A domain rule both sides read cannot depend on the database layer.',
            },
          ],
          patterns: [
            {
              group: ['@api/*', '../api/*', '../../api/*', '@site/*', '../site/*', '../../site/*'],
              message:
                'A domain rule reaches into neither side. See ADR-0010: the folder exists because both sides read it.',
            },
            {
              group: ['@aws-sdk/*', 'aws-cdk-lib', 'pg', 'postgres'],
              message: 'A domain rule both sides read cannot depend on infrastructure.',
            },
          ],
        },
      ],
    },
  },

  // A site never imports a database package. The back end owns the database and
  // the typed client is the only way across; a bundler pulling `pg` into a
  // browser build fails at run time rather than at build time.
  {
    files: SITE_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['pg', 'postgres', 'drizzle-orm/*', '@aws-sdk/client-dsql'],
              message:
                'The site reaches the database through the typed Hono client, never directly. See docs/standards/06-data-fetching.md.',
            },
          ],
        },
      ],
    },
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

      // docs/standards/01-naming.md: a literal in a function body gets a name,
      // because the `const` declaration is what documents the choice.
      //
      // The exemptions, and why each one is not a naming decision in disguise:
      // `ignore` holds the identity values and the HTTP status codes above.
      // `ignoreArrayIndexes` covers `tuple[2]`, where the index is the name of
      // the slot rather than a quantity. `ignoreDefaultValues` covers
      // `function f(retries = 3)`, where the parameter name already names the
      // value. `ignoreClassFieldInitialValues` is the same case for a field.
      // `enforceConst` rejects `let MAXIMUM = 12`, so a named literal cannot be
      // reassigned. `detectObjects` stays off, because an object literal's key
      // is already the name the rule is asking for.
      'no-magic-numbers': [
        'error',
        {
          ignore: [...IDENTITY_VALUES, ...HTTP_STATUS_CODES],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreClassFieldInitialValues: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],
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
      'apps/*/api/src/**/*.adapter.ts',
      'apps/*/site/src/*-store.ts',
      'apps/*/site/src/**/*.store.ts',
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
      // The plugin ships this one at `warn`, and no gate here passes
      // `--max-warnings`, so a stale dependency array failed nothing. Standard
      // 07 leans on it: an effect that survives review is allowed through a
      // disable comment, and this is what makes the comment necessary.
      'react-hooks/exhaustive-deps': 'error',
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
      // A fixture literal is not a magic number. A test names its value in the
      // `it` title and in the expectation next to it, so hoisting `42` to a
      // `const` moves the number away from the assertion that gives it meaning.
      // There are around fifteen hundred of them across the repository.
      'no-magic-numbers': 'off',
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
      // `handler` looks unused because nothing in this repository calls it.
      // The CloudFront Functions runtime does, by that exact name, after the
      // file is read as a string at synth time and shipped to the edge. There
      // is no import to make the reference visible.
      'no-unused-vars': ['error', { varsIgnorePattern: '^handler$' }],
    },
  },

  // Code a person runs from a terminal and reads the output of. `no-console`
  // exists to keep logging out of what ships, and none of these ship: a build
  // script prints its progress, and `main.dev.ts` prints the port the local
  // API bound to. The Lambda entry point is `main.ts`, which keeps the rule.
  {
    files: [
      'eslint-rules/**/*.js',
      'scripts/**/*.{js,mjs,ts}',
      '.claude/skills/**/*.ts',
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
