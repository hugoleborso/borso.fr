import { describe, expect, it } from 'vitest';
import { isTestFile } from './test-file.core.ts';

describe('isTestFile', () => {
  it.each([
    'apps/pragma/site/src/Page.test.tsx',
    'apps/pragma/api/src/song.test.ts',
    'scripts/x.test.js',
    'apps/pragma/site/src/page.test-utils.tsx',
    'apps/pragma/site/src/page.test-utils.ts',
    'apps/pragma/site/src/test-setup.ts',
    'apps/pragma/site/src/test-setup.tsx',
    'apps/pragma/test/e2e/sign-in.spec.ts',
    'infra/cdk/test/fixtures/stack.json',
    'infra/cdk/test/unit/helpers/mock.ts',
    'infra/cdk/test/unit/fixtures/stack.json',
  ])('counts %s as a test file', (path) => {
    expect(isTestFile(path)).toBe(true);
  });

  it.each([
    'apps/pragma/site/src/Page.tsx',
    'apps/pragma/site/src/Page.test.tsx.snap',
    'apps/pragma/site/src/test-setup.ts.bak',
    'apps/pragma/site/src/latest-setup.ts',
    'apps/pragma/site/src/contest-utils.tsx',
    'apps/pragma/site/src/page.testutils.tsx',
    'apps/pragma/site/src/page.test-utils.js',
    'apps/pragma/site/src/test-setup.js',
    'xapps/pragma/test/e2e.ts',
    'apps/pragma/site/test/e2e.ts',
    'infra/cdk/test/unit/stack.ts',
    'infra/cdk/test/other/helpers/mock.ts',
    'infra/cdk/test/helpersx/mock.ts',
    'infra/cdk/test/fixtures',
  ])('does not count %s as a test file', (path) => {
    expect(isTestFile(path)).toBe(false);
  });
});
