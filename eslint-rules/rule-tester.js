import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { afterAll, describe, it } from 'vitest';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.afterAll = afterAll;

export function createRuleTester(
  defaultFilename = 'apps/pragma/site/src/Example.tsx',
  { jsx = true } = {},
) {
  const tester = new RuleTester({
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx } },
    },
  });

  const originalRun = tester.run.bind(tester);
  tester.run = (name, rule, tests) =>
    originalRun(name, rule, {
      valid: tests.valid.map((test) => withFilename(test, defaultFilename)),
      invalid: tests.invalid.map((test) => withFilename(test, defaultFilename)),
    });

  return tester;
}

function withFilename(test, defaultFilename) {
  const normalised = typeof test === 'string' ? { code: test } : test;
  return { filename: defaultFilename, ...normalised };
}
