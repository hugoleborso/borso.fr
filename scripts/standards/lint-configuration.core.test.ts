import { matchesGlob } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  listActiveRules,
  readConfiguredRuleName,
  readLiteralSuffix,
  readRulePlugin,
  skipImpossibleMatches,
  type LintConfiguration,
} from './lint-configuration.core';

const EMPTY_CONFIGURATION: LintConfiguration = {
  plugins: [],
  jsPlugins: [],
  rules: {},
  overrides: [],
};

const CONFIGURATION: LintConfiguration = {
  plugins: ['unicorn'],
  jsPlugins: [{ name: 'borso', specifier: './eslint-rules/index.js' }],
  rules: {
    'no-magic-numbers': 'error',
    'unicorn/catch-error-name': ['error', { name: 'failure' }],
    'borso/no-comments': 'error',
    'typescript/no-explicit-any': 'error',
    'react/exhaustive-deps': 'off',
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.mts'],
      plugins: ['typescript'],
      rules: { 'typescript/no-unsafe-call': 'error' },
    },
    { files: ['**/*.test.ts'], plugins: [], rules: { 'no-magic-numbers': 'off' } },
    {
      files: ['apps/*/site/**/*.tsx'],
      plugins: ['react'],
      rules: { 'react/exhaustive-deps': 1 },
    },
    { files: ['scripts/**/*.ts'], plugins: [], rules: { 'typescript/no-unsafe-call': ['allow'] } },
  ],
};

describe('listActiveRules', () => {
  it('keeps a base rule whose plugin every file has', () => {
    expect(listActiveRules(CONFIGURATION, 'eslint-rules/probe.js', matchesGlob)).toEqual([
      'borso/no-comments',
      'no-magic-numbers',
      'unicorn/catch-error-name',
    ]);
  });

  it('adds the plugin and the rules of every override whose files match', () => {
    expect(listActiveRules(CONFIGURATION, 'apps/pragma/api/src/probe.ts', matchesGlob)).toEqual([
      'borso/no-comments',
      'no-magic-numbers',
      'typescript/no-explicit-any',
      'typescript/no-unsafe-call',
      'unicorn/catch-error-name',
    ]);
  });

  it('applies an override when any one of its patterns matches', () => {
    expect(listActiveRules(CONFIGURATION, 'apps/pragma/api/src/probe.mts', matchesGlob)).toContain(
      'typescript/no-unsafe-call',
    );
  });

  it('lets a later override turn a rule off, by word or by number in an array', () => {
    expect(listActiveRules(CONFIGURATION, 'scripts/probe.test.ts', matchesGlob)).toEqual([
      'borso/no-comments',
      'typescript/no-explicit-any',
      'unicorn/catch-error-name',
    ]);
  });

  it('turns a rule on with a numeric severity once its plugin is enabled', () => {
    expect(listActiveRules(CONFIGURATION, 'apps/pragma/site/src/Probe.tsx', matchesGlob)).toContain(
      'react/exhaustive-deps',
    );
  });

  it('enables a plugin from an override that sets no rule, for the base rules it carries', () => {
    const configuration: LintConfiguration = {
      ...EMPTY_CONFIGURATION,
      rules: { 'import/no-cycle': 'error' },
      overrides: [{ files: ['**/*.js'], plugins: ['import'], rules: {} }],
    };
    expect(listActiveRules(configuration, 'eslint-rules/probe.js', matchesGlob)).toEqual([
      'import/no-cycle',
    ]);
  });

  it('reads a configuration with nothing in it as no rule at all', () => {
    expect(listActiveRules(EMPTY_CONFIGURATION, 'scripts/probe.ts', matchesGlob)).toEqual([]);
  });
});

describe('readRulePlugin', () => {
  it('reads the plugin before the last slash, scoped names included', () => {
    expect(readRulePlugin('@eslint-community/eslint-comments/require-description')).toBe(
      '@eslint-community/eslint-comments',
    );
  });

  it('reads a bare name as a core rule', () => {
    expect(readRulePlugin('no-magic-numbers')).toBe('eslint');
  });
});

describe('readConfiguredRuleName', () => {
  it('turns a plugin diagnostic code into the name the configuration uses', () => {
    expect(readConfiguredRuleName('typescript(no-explicit-any)')).toBe(
      'typescript/no-explicit-any',
    );
  });

  it('keeps a scoped plugin name whole', () => {
    expect(readConfiguredRuleName('@eslint-community/eslint-comments(require-description)')).toBe(
      '@eslint-community/eslint-comments/require-description',
    );
  });

  it('reads a React hooks rule under the plugin name the configuration uses', () => {
    expect(readConfiguredRuleName('react-hooks(exhaustive-deps)')).toBe('react/exhaustive-deps');
  });

  it('reads a core rule without its prefix', () => {
    expect(readConfiguredRuleName('eslint(no-magic-numbers)')).toBe('no-magic-numbers');
  });

  it('reads a plugin whose name is a single letter', () => {
    expect(readConfiguredRuleName('x(rule)')).toBe('x/rule');
  });

  it('reads no rule from a code that is not in the plugin(rule) shape', () => {
    expect(readConfiguredRuleName('parse error')).toBeNull();
  });

  it('reads no rule from a code with no plugin before the parenthesis', () => {
    expect(readConfiguredRuleName('(no-magic-numbers)')).toBeNull();
  });

  it('reads no rule from a code whose parenthesis never closes', () => {
    expect(readConfiguredRuleName('typescript(no-explicit-any')).toBeNull();
  });
});

describe('readLiteralSuffix', () => {
  it('reads the literal text after the last wildcard', () => {
    expect(readLiteralSuffix('apps/*/site/**/*.store.ts')).toBe('.store.ts');
  });

  it('reads a pattern with no wildcard as a whole literal', () => {
    expect(readLiteralSuffix('vitest.config.ts')).toBe('vitest.config.ts');
  });

  it.each(['?', '[', ']', '{', '}', '(', ')', '!', '+', '@', '\\'])(
    'reads no literal suffix when the tail holds %s',
    (metacharacter) => {
      expect(readLiteralSuffix(`**/*.t${metacharacter}s`)).toBe('');
    },
  );
});

describe('skipImpossibleMatches', () => {
  it('refuses a path that cannot end the way the pattern does, without matching', () => {
    const calls: string[] = [];
    const isMatch = skipImpossibleMatches((path) => {
      calls.push(path);
      return true;
    });
    expect(isMatch('scripts/probe.tsx', '**/*.ts')).toBe(false);
    expect(calls).toEqual([]);
  });

  it('defers to the matcher when the suffix fits', () => {
    expect(skipImpossibleMatches(matchesGlob)('scripts/probe.ts', 'scripts/**/*.ts')).toBe(true);
    expect(skipImpossibleMatches(matchesGlob)('apps/probe.ts', 'scripts/**/*.ts')).toBe(false);
  });
});
