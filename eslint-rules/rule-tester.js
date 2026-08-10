import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { afterAll, describe, it } from 'vitest';

// ESLint's RuleTester registers its cases through whatever test globals it
// finds, and Vitest does not install those globals unless `globals: true` is
// set. Wiring them here keeps the vitest config free of a setting that exists
// only for one folder.
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.afterAll = afterAll;

/**
 * A RuleTester wired to the TypeScript parser.
 *
 * `filename` defaults to a path under an application, because two rules read
 * the file name, and a test that forgot to set one would silently exercise the
 * wrong branch. Pass `jsx: false` for the rules that only ever run on back end
 * `.ts` files, where the angle bracket type assertion parses.
 */
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
