import { matchesGlob } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  listActiveRules,
  readConfiguredRuleName,
  readRulePlugin,
  type LintConfiguration,
} from './lint-configuration.core';

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
      files: ['**/*.ts'],
      plugins: ['typescript'],
      rules: { 'typescript/no-unsafe-call': 'error' },
    },
    { files: ['**/*.test.ts'], rules: { 'no-magic-numbers': 'off' } },
    { files: ['apps/*/site/**/*.tsx'], plugins: ['react'], rules: { 'react/exhaustive-deps': 1 } },
    { files: ['scripts/**/*.ts'], rules: { 'typescript/no-unsafe-call': ['allow'] } },
    { files: ['**/*.js'], plugins: ['import'] },
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
    expect(
      listActiveRules(
        {
          rules: { 'import/no-cycle': 'error' },
          overrides: [{ files: ['**/*.js'], plugins: ['import'] }],
        },
        'eslint-rules/probe.js',
        matchesGlob,
      ),
    ).toEqual(['import/no-cycle']);
  });

  it('reads a configuration with nothing in it as no rule at all', () => {
    expect(listActiveRules({}, 'scripts/probe.ts', matchesGlob)).toEqual([]);
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

  it('reads no rule from a diagnostic that has no code, such as an unused directive', () => {
    expect(readConfiguredRuleName(undefined)).toBeNull();
  });

  it('reads no rule from a code that is not in the plugin(rule) shape', () => {
    expect(readConfiguredRuleName('parse error')).toBeNull();
  });
});
