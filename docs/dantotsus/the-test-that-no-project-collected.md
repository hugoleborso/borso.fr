---
date: 2026-09-18
introduced-at: implementation
detected-at: local
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/108
fix-pr: https://github.com/hugoleborso/borso.fr/pull/109
fix-commits: [PENDING]
eradication-level: 2
time-to-detect: months
tags: [gates, testing, vitest, pragma, last-loop-lepin, meta]
---

# The test that no project collected

## Symptom

A new test file was written at `apps/pragma/site/src/sw/service-worker.test.ts`
and run. Vitest answered:

```
No test files found, exiting with code 1

filter: site/src/sw/service-worker.test.ts
projects: core

include: domain/**/*.core.test.ts, api/src/**/*.core.test.ts,
  api/src/**/*.utils.test.ts, api/src/**/*.adapter.test.ts,
  api/src/**/*.schema.test.ts, cdk/test/**/*.test.ts,
  site/src/**/*.utils.test.ts, site/src/**/*.core.test.ts,
  site/src/**/*.adapter.test.ts, site/src/**/*.test.tsx
```

The file was named after its subject rather than after a gated suffix, so no
include matched it. Had the run not been filtered to that one path, the suite
would have passed with the file silently absent.

## Root-cause chain

1. **Why did the file not run?** The `core` project lists its `site/src`
   includes by suffix: `*.utils.test.ts`, `*.core.test.ts`,
   `*.adapter.test.ts` and `*.test.tsx`. A `.test.ts` named anything else
   matches none of them.

2. **Why were the includes written that way?** They mirror `coverage.include`,
   which selects the gated pure files by the same suffixes. Tying collection
   to the coverage list makes the fast project cheap to reason about, and
   silently makes the suffix a precondition for running at all.

3. **Why did no other workspace show the problem?** Because the two
   front-end-only workspaces do not share the assumption. `borso-fr` collects
   `site/src/**/*.test.{ts,tsx}` and `borsouvertures` collects the two
   patterns that add up to the same thing. Only the two full-stack workspaces
   narrowed it, and those are the ones with a service worker.

4. **Why did nothing report the gap?** Nothing looks in that direction. The
   `borso/test-file-has-sibling-source` rule reads source to test and asks
   whether a gated file has a test beside it. Nothing reads test to suite and
   asks whether a test is ever loaded. knip treats every `*.test.ts` as an
   entry point, so an uncollected test is still reachable. Coverage cannot
   report a file that no test loaded, and a green run with one fewer file
   looks exactly like a green run with all of them.

5. **Why does that matter beyond one file?** Because it is why
   `apps/pragma/site/public/sw.js` had no test. Anyone who had tried to write
   one, at any point, would have got a pass and no test.

**Root cause:** thought *a committed test file runs*, actually *a test file
runs only if some project's include matches its name, and a test that matches
nothing fails no gate, because absence and success are the same colour*.

## Detection failure causes

- **Typing:** a test file that is never loaded still typechecks.
- **Linter / static analysis:** ESLint lints it, and lints it correctly. The
  question of whether anything runs it is outside every rule.
- **Functional validation locally:** an unfiltered `vitest run` prints a file
  count nobody compares against the tracked file count.
- **CI:** the same, one number lower.
- **Code review:** a reviewer reads the test and the source. The include list
  lives in a config file the diff does not touch.

## Countermeasure

Widen both full-stack workspaces to `site/src/**/*.test.{ts,tsx}`, which is
what the other two already did.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — pre-commit gate)

**Reference:** [PR #109](https://github.com/hugoleborso/borso.fr/pull/109)

**The actual fix:**

```diff
-           'site/src/**/*.utils.test.ts',
-           'site/src/**/*.core.test.ts',
-           'site/src/**/*.adapter.test.ts',
-           'site/src/**/*.test.tsx',
+           'site/src/**/*.test.{ts,tsx}',
```

plus `scripts/check-every-test-is-collected.sh`, wired into pre-commit, which
asks vitest itself which files it would collect and compares that against the
test files git tracks in the same workspace:

```sh
tracked="$(git ls-files -- "$workspace" | grep -E '\.test\.tsx?$' | …)"
collected="$( (cd "$workspace" && pnpm exec vitest list --filesOnly) | … )"
comm -23 <(echo "$tracked") <(echo "$collected")
```

Asking the runner rather than reimplementing its globs is the point: a check
that parsed the include patterns itself would be a third copy of the matching
rules and could disagree with both. `vitest list --filesOnly` costs about a
second per workspace, six over the repository, and runs no `globalSetup`, so
the back-e2e project's Postgres never starts.

Verified by narrowing pragma's include back and watching the gate name every
file that stopped being collected.

**Sibling defects swept:** `apps/last-loop-lepin/vitest.config.ts` carried the
same four narrow patterns and was widened in the same commit. No uncollected
test existed in the repository at the time; the gate is there for the next one.

## See also

- [The allowance that parked a duplicate, and then let it grow](./the-allowance-that-let-a-duplicate-grow.md), the defect this one was found while fixing.
- [Three green gates on fifty-eight lines that ran nowhere](./three-green-gates-on-code-that-ran-nowhere.md), the same family: a gate whose green says less than it appears to.
