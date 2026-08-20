---
date: 2026-08-20
introduced-at: infra/cdk/test
detected-at: unit test
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/76
fix-commit: n/a (the mock must stay a function declaration)
time-to-detect: minutes
tags: [vitest, mocking, testing, vendor-quirk]
---

# Vitest 4 invokes a mock's implementation as a constructor

A mock standing in for a class that callers reach with `new` must be a
**`function` declaration, never an arrow function**.

Vitest 4 invokes a mock's implementation *as a constructor* rather than calling
it and taking its return value. An arrow function has no `[[Construct]]` slot,
so the call fails with `… is not a constructor`.

This is why `mockDsqlSigner` in the migration-runner test files is a named
function declaration. Converting it to an arrow — the sort of tidy-up that looks
purely stylistic — breaks the suite.

    function mockDsqlSigner() {          // works
      return { getDbConnectAdminAuthToken: async () => 'token' };
    }

    const mockDsqlSigner = () => ({ … }); // "is not a constructor"

## Recognising it

`TypeError: … is not a constructor` from a test that mocks a class, where the
mock itself looks correct and the production code plainly does `new X(...)`.
