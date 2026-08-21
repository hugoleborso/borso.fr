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
const WORKSPACE_TOOLING_FILES = [
  'apps/*/*.config.ts',
  'apps/*/bin/**/*.ts',
  'apps/*/cdk/bin/**/*.ts',
  'apps/*/scripts/**/*.{ts,mjs}',
];

const SITE_FILES = ['apps/*/site/**/*.{ts,tsx}'];
const API_FILES = ['apps/*/api/src/**/*.ts'];
const CROSS_BOUNDARY_DOMAIN_FILES = ['apps/*/domain/**/*.ts'];
const APPLICATION_AND_INFRASTRUCTURE_FILES = ['apps/**/*.{ts,tsx}', 'infra/**/*.ts'];
const CHESS_APPLICATION_FILES = ['apps/borsouvertures/**/*.{ts,tsx}'];
const TEST_FILES = ['**/*.test.{ts,tsx,js}', '**/*.test-utils.ts', '**/test/**/*.ts'];

const MODULE_LEVEL_SINGLETON_FILES = [
  'apps/*/api/src/database/client.ts',
  'apps/*/api/src/**/*.adapter.ts',
  'apps/*/site/src/*-store.ts',
  'apps/*/site/src/**/*.store.ts',
  'apps/*/test/**/*.ts',
];
const UNBUNDLED_BROWSER_SCRIPT_FILES = ['apps/*/site/**/*.js'];
const CLOUDFRONT_FUNCTION_FILES = ['**/*.code.js'];
const REPOSITORY_TOOLING_FILES = [
  'scripts/**/*.ts',
  '.claude/skills/**/*.ts',
  'eslint-rules/**/*.js',
];
const TERMINAL_PROGRAM_FILES = [
  'eslint-rules/**/*.js',
  'scripts/**/*.{js,mjs,ts}',
  '.claude/skills/**/*.ts',
  '*.config.{js,ts}',
  'apps/*/scripts/**/*.{ts,mjs}',
  'apps/*/api/src/main.dev.ts',
];

const IDENTITY_VALUES = [0, 1, -1];
const HTTP_STATUS_CODES = [
  200, 201, 204, 301, 302, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503,
];

const TIME_UNIT_FACTORS = [1000, 60, 24, 7, 365];

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cdk.out/**',
      '**/coverage/**',
      '**/.reports/**',
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

  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      '@eslint-community/eslint-comments/require-description': [
        'error',
        { ignore: ['eslint-enable'] },
      ],
    },
  },

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
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: true, ignoreVoidOperator: true },
      ],
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

  {
    files: UNPROJECTED_TYPESCRIPT_FILES,
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      parserOptions: { projectService: false, project: false, program: null },
    },
  },

  {
    plugins: { borso: borsoPlugin, 'import-x': importX },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ alwaysTryTypes: true, project: TSCONFIG_PATHS }),
      ],
    },
    rules: {
      'borso/no-comments': 'error',
      'borso/no-type-assertion-except-unknown': 'error',
      'borso/no-inline-subscribe-in-use-sync-external-store': 'error',
      'borso/no-controller-imports-outside-service': 'error',

      'max-lines': [
        'error',
        { max: MAXIMUM_LINES_PER_FILE, skipBlankLines: true, skipComments: true },
      ],

      'import-x/no-cycle': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-duplicates': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
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

  {
    files: APPLICATION_AND_INFRASTRUCTURE_FILES,
    ignores: WORKSPACE_TOOLING_FILES,
    plugins: { borso: borsoPlugin },
    rules: {
      'borso/conditions-live-in-pure-functions': 'error',
      'borso/pure-functions-live-in-core-files': 'error',
      'borso/no-impure-calls-in-core-files': 'error',
      'borso/no-step-named-value': 'error',
    },
  },

  {
    files: [...API_FILES, ...CROSS_BOUNDARY_DOMAIN_FILES, ...SITE_FILES],
    plugins: { borso: borsoPlugin },
    rules: {
      'borso/no-outbound-call-outside-adapter': 'error',
      'borso/no-adapter-import-in-pure-module': 'error',
    },
  },

  {
    files: API_FILES,
    plugins: { borso: borsoPlugin },
    rules: {
      'borso/no-array-methods-in-controllers': 'error',
      'borso/no-horizontal-folders-in-api': 'error',
      'borso/no-cross-slice-repository-imports': 'error',
      'borso/no-database-client-outside-repository': 'error',
      'borso/no-raw-sql-outside-migrations': 'error',
    },
  },

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
      'borso/no-refetch-of-optimistically-written-query': 'error',
    },
  },

  {
    files: SITE_FILES,
    plugins: { borso: borsoPlugin },
    rules: { 'borso/no-string-concatenated-class-names': 'error' },
  },

  {
    files: CROSS_BOUNDARY_DOMAIN_FILES,
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

  {
    files: APPLICATION_AND_INFRASTRUCTURE_FILES,
    plugins: { borso: borsoPlugin },
    rules: {
      'borso/no-abbreviated-identifier': 'error',
      'borso/function-names-are-verb-phrases': 'error',
      'borso/verb-promises-match-return-type': 'error',
      'borso/no-french-identifiers': 'error',
      'borso/test-file-has-sibling-source': 'error',

      'no-magic-numbers': [
        'error',
        {
          ignore: [...IDENTITY_VALUES, ...HTTP_STATUS_CODES, ...TIME_UNIT_FACTORS],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreClassFieldInitialValues: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],
    },
  },

  {
    files: CHESS_APPLICATION_FILES,
    plugins: { borso: borsoPlugin },
    rules: {
      'borso/no-french-identifiers': ['error', { allowedWords: ['piece'] }],
    },
  },

  {
    plugins: { unicorn },
    rules: {
      'unicorn/consistent-boolean-name': 'error',
      'unicorn/catch-error-name': 'error',
      'unicorn/consistent-function-scoping': 'error',

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

  {
    files: MODULE_LEVEL_SINGLETON_FILES,
    rules: { 'unicorn/no-top-level-assignment-in-function': 'off' },
  },

  {
    files: UNBUNDLED_BROWSER_SCRIPT_FILES,
    languageOptions: {
      globals: { ...globals.browser },
      sourceType: 'script',
    },
  },

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
      '@typescript-eslint/no-dynamic-delete': 'off',
      '@typescript-eslint/require-await': 'off',
      'max-lines': 'off',
      'no-magic-numbers': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },

  {
    files: CLOUDFRONT_FUNCTION_FILES,
    rules: {
      'prefer-template': 'off',
      'no-var': 'off',
      'no-inner-declarations': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/prefer-optional-catch-binding': 'off',
      'no-unused-vars': ['error', { varsIgnorePattern: '^handler$' }],
    },
  },

  {
    files: REPOSITORY_TOOLING_FILES,
    plugins: { borso: borsoPlugin },
    rules: {
      'borso/verb-promises-match-return-type': 'error',
    },
  },

  {
    files: TERMINAL_PROGRAM_FILES,
    rules: {
      'no-console': 'off',
      'max-lines': 'off',
    },
  },

  prettierConfig,
);
