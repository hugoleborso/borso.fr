import { appendFileSync } from 'node:fs';
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { afterAll, describe, it } from 'vitest';

const GATE_CANARY_CASES_VARIABLE = 'GATE_CANARY_CASES';

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
  tester.run = (name, rule, tests) => {
    const invalid = tests.invalid.map((test) => withFilename(test, defaultFilename));
    recordForGateCanaries(name, invalid);
    return originalRun(name, rule, {
      valid: tests.valid.map((test) => withFilename(test, defaultFilename)),
      invalid,
    });
  };

  return tester;
}

function recordForGateCanaries(name, invalid) {
  const casesFile = process.env[GATE_CANARY_CASES_VARIABLE];
  if (casesFile === undefined || casesFile === '') return;
  appendFileSync(casesFile, `${JSON.stringify({ name, invalid })}\n`);
}

function withFilename(test, defaultFilename) {
  const normalised = typeof test === 'string' ? { code: test } : test;
  return { filename: defaultFilename, ...normalised };
}
