# Technical validation — A member's own write keeps another member's change visible

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md)
- Branch: claude/pragma-writes-keep-staleness
- Base: origin/main (round 2 diff: `f16d524e4620ee779454d420b930f7370bf13d9c..HEAD`)
- Run at: 2026-11-14T09:52:01Z
- Round: 2
- Reviewed: 86be30946016c4f765e80f983ca47208f2f96707
- Touched workspaces: @borso-app/pragma (site test only), root `eslint-rules/`

Round 2 reads one commit (`86be30946`, "test(pragma): prove a kept staleness sends no request"). It changes `cache-write.queries.test.ts`, `no-direct-query-cache-write.js`, its test, and adds the round-1 report. It carries no new scope. The commit message dismisses no finding: it claims D07 and A12 fixed, and each gets a row. No merge commit sits above the reviewed SHA. HEAD did not move during the review. The spec is in the short form; 1 use case stays routed to /visual-validation, out of scope for this report.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Behaviour 4 | The lint rule refuses a direct `setQueryData`/`setQueriesData`, now in its computed spelling too | eslint-rules/no-direct-query-cache-write.js:15-25 | `if (callee.computed && callee.property.type === 'Literal') return String(callee.property.value);` / `return name !== null && CACHE_WRITE_METHODS.has(name) ? name : null;` | PASS |
| A02 | Behaviour 4 | The rule still ignores a non-write computed call and a dynamic key it cannot name | no-direct-query-cache-write.test.js:14-15 | valid: `'queryClient[method](songKeys.list(), next);'`, `'queryClient["getQueryData"](songKeys.list());'` | PASS |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | D07 (blocking): Behaviour 2 "never sends a request" had no test that could fail | `86be30946` apps/pragma/site/src/lib/queries/cache-write.queries.test.ts:56-74. `it('sends no request for a stale entry a screen is watching')` subscribes a `QueryObserver` with a `vi.fn` `queryFn` (:59-63), waits for its mount fetch, invalidates with `refetchType: 'none'`, clears the mock, writes, and asserts `expect(fetchList).not.toHaveBeenCalled();` (:71). Mutant checked against query-core directly, without touching the tree: with `query.invalidate()` the `queryFn` ran 0 times after the write; with `void queryClient.invalidateQueries({ queryKey, exact: true })` it ran 1 time (measured, scratch script `mutant.mjs`). The 10 microtask turns the test flushes are the same count the script used. The test kills the round-1 mutant | PASS |
| R02 | A12 (non-blocking): computed `queryClient['setQueryData'](…)` linted clean | `86be30946` no-direct-query-cache-write.js:17; test moved from valid to invalid at no-direct-query-cache-write.test.js:31-34 with `errors: [{ messageId: 'directCacheWrite', data: { method: 'setQueryData' } }]` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read added lines | `readPropertyName`, `fetchList`, `observer`, `unsubscribe`; none abbreviated | PASS |
| B02 | Magic numbers / strings | read added lines | none added; keys reuse `LIST_KEY` | PASS |
| B03 | No prose comments | grep `^\+.*// ` on added lines | none found | PASS |
| B04 | Function names describe the result | sampled | `readPropertyName` returns the member's static name or `null` | PASS |
| B05 | Type assertions limited | grep ` as [A-Z]` on added lines | none found | PASS |
| B06 | No `any` | `grep -P '\bany\b'` on added lines | none found | PASS |
| B07 | `noUncheckedIndexedAccess` | read added lines; `pnpm run typecheck` in apps/pragma | no index access added; typecheck exit 0 | PASS |
| B08 | Lint clean | `pnpm exec oxlint --type-aware <3 changed code files>` and `pnpm exec oxlint --type-aware apps/pragma/site/src` | both exit 0; the stricter rule finds no computed write in the site | PASS |
| B09 | `useEffect` is a smell | grep on added lines | none found | PASS |
| B10 | Standards checklist | read the 3 changed files in full | the rule file keeps its `// @FollowsBlueprint lint-rule` shape and exported predicate; the test change is a test, outside the checklist's source scope. No bullet finds anything | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed f16d524e4620ee779454d420b930f7370bf13d9c --coverage --reporter=verbose` | 0 (1 file, 7 tests: cache-write.queries.test.ts, including the new :56 test) | PASS |
| C02 | @borso-app/pragma e2e | not run | the round-2 diff touches no `api/` file; round 1's `--changed` e2e run found no test file | PASS |
| C03 | root `eslint-rules` | `npx vitest run eslint-rules/no-direct-query-cache-write.test.js eslint-rules/disable-directives.test.js` | 0 (2 files, 21 tests) | PASS |
| C04 | mutation gate | `scripts/mutate-changed.sh` | not run: no `.core`, `.utils` or `.adapter` file changed, and `eslint-rules/` is outside the Stryker `mutate` set | PASS |
| C05 | lockfile / catalog | `git diff --name-only` | unchanged | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Behaviour 2: keeping an entry stale never sends a request by itself | `it('sends no request for a stale entry a screen is watching')` at cache-write.queries.test.ts:56, `expect(fetchList).not.toHaveBeenCalled();` at :71, with an active observer; kills the `invalidateQueries` mutant (R01) | PASS |
| D02 | Behaviour 4: refuses the computed spelling | no-direct-query-cache-write.test.js:31-34, invalid `queryClient["setQueryData"](songKeys.list(), next);` | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | Database writes and module state | Check-then-write, per-process state | the round-2 diff touches no `*.service.ts`, `*.repository.ts`, `*.controller.ts` or `api/` file and adds no module-level variable (`git diff f16d524e..HEAD`; the only module-level additions are the function `readPropertyName`) | PASS |

## Blocking findings

- none

## Non-blocking findings

- none

## Notes

- The rule names a computed key only when it is a `Literal`. A template literal `` queryClient[`setQueryData`](…) `` would still lint clean. No code in the site uses that spelling (site-wide oxlint exit 0), so this is a question, not a finding: is that spelling worth catching?
- Round 1's three notes (the `test-query-hook` blueprint on plain-function tests, the undriven `readCacheWriteMethod` export, the unasserted detail `title`) are untouched by this commit and stay open questions.

## Verdict: PASS
