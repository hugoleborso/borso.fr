# Technical validation — Every app traces to Sentry as pragma does

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (`../plan/plan.md` does not exist; the decision record is [`ADR-2026-11-11T1903`](../../../../adr/2026-11-11T1903-every-app-traces-to-sentry-at-full-rate.md))
- Branch: feat/sentry-tracing-all-apps
- Base: origin/main
- Run at: 2026-11-11T19:35:38Z
- Round: 2
- Reviewed: b87c92d9b6ca4b0fa9fdb65dcf439f2508ae5961
- Previous: [`technical-validation-2026-11-11-1908.md`](./technical-validation-2026-11-11-1908.md), reviewed `e61949698735005dd2b974719f7ab6f39fee1547`
- Touched workspaces: @borso-app/last-loop-lepin, @borso-app/banana-rush, @borso-app/talos, @borso-app/pragma (one doc block), repository root `scripts/`

This round reads only `git diff e61949698..b87c92d9b` (three commits, 22 files). `bece68f92` turns each API's wide-event middleware into a factory that takes the trace-id reader. `f1ce5a5dd` fixes `scripts/reports.sh`. `b87c92d9b` commits the round-1 report. The spec is in the short form. 0 use cases routed to /visual-validation; out of scope for this report. No pull request is open for the branch (`gh api repos/.../pulls?head=…` returns none), and no commit dismisses a round-1 finding, so the only re-check rows are the two blocking ones.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | Plan | A plan exists for the change | `docs/features/meta/sentry-tracing-all-apps/plan/plan.md` | still absent; carried from round 1 | UNVERIFIABLE |
| A21 | UC4 | Wide event's `trace.id` is the span's trace id, after the refactor (last-loop-lepin, banana-rush, talos) | apps/{last-loop-lepin,banana-rush,talos}/api/src/helpers/observability/wide-event.middleware.ts:11,20,38 | `export function buildWideEventRecording(findTraceId: () => string \| null): MiddlewareHandler {` … `'trace.id': findTraceId() ?? undefined,` … `export const recordWideEvents = buildWideEventRecording(findActiveTraceId);` and `app.ts` still mounts `.use('*', recordWideEvents)` (last-loop-lepin app.ts:21, banana-rush :19, talos :33) | PASS |
| A22 | ADR pointer | The ADR links the spec this branch adds | docs/adr/2026-11-11T1903-every-app-traces-to-sentry-at-full-rate.md:142 | `- Spec: [\`docs/features/meta/sentry-tracing-all-apps/spec/spec.md\`](../features/meta/sentry-tracing-all-apps/spec/spec.md), written from the operator's request.` Answers round-1 Note A00 | PASS |
| A23 | Out of spec, repo gate | `scripts/reports.sh` passes with the new Sentry externals and `weak-point: none` | scripts/quality/weak-points.core.ts:130-135; scripts/architecture/manifests/*.manifest.ts | `return weakPoint === NO_WEAK_POINT ? null : weakPoint;`; `scripts/reports.sh all` exit 0 this session, and the blueprint index lists `middleware-request-tracing` at row 186 with 3 followers | PASS |

## Round-1 findings

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | C02 — last-loop-lepin `wide-event.middleware.test.ts` failed under `test:e2e --changed origin/main` because `vi.mock` could not reach a module `isolate: false` had already loaded | `bece68f92` apps/last-loop-lepin/api/src/helpers/observability/wide-event.middleware.test.ts:1-5 drops the `vi.mock('./error-reporting.adapter', …)` and drives `buildWideEventRecording(() => TRACE_ID)` at :104. `pnpm --filter @borso-app/last-loop-lepin run test:e2e --changed origin/main --reporter=verbose` exit 0, 13 files, 62 tests, the same 13 files as round 1 including `api/src/app.test.ts`, and `✓ … wide-event.middleware.test.ts > recordWideEvents > carries the id of the trace the request span belongs to, and leaves it out when none is active` | PASS |
| R02 | D07 — UC4 `trace.id` had no working coverage in last-loop-lepin | `bece68f92` same test, :101; assertions :108 `expect(tracedEvent).toMatchObject({ 'trace.id': TRACE_ID });` and :109 `expect(untracedEvent).not.toHaveProperty('trace.id');`, passing in the suite run of R01 | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B16 | Lint clean (type-aware) | `pnpm --filter @borso-app/<pkg> run lint` for last-loop-lepin, banana-rush, talos, pragma; `pnpm exec oxlint --type-aware` on the changed `scripts/` files | exit 0 ×5, no diagnostics | PASS |
| B17 | Typecheck | `pnpm --filter @borso-app/<pkg> run typecheck` ×4 | exit 0 ×4 | PASS |
| B18 | Names, magic values, no `any`, no assertions | read the diff in full; `git diff e61949698..HEAD \| grep -nP '^\+.*(\bany\b\| as [A-Z])'` | none. New names `buildWideEventRecording`, `findTraceId`, `selectWeakPoint`, `NO_WEAK_POINT` | PASS |
| B19 | Standards checklist (01-naming): "a `find…` returns `null` … a `build…`, `project…` or `select…` returns what its verb says" | read in full | `buildWideEventRecording` returns a `MiddlewareHandler`; `findTraceId: () => string \| null`; `selectWeakPoint(field: string \| undefined): string \| null` chooses between null and the stripped value | PASS |
| B20 | Standards checklist (01-naming): "a comment documents something the code cannot say" | read the one comment added | apps/pragma/api/src/helpers/observability/request-tracing.middleware.ts:18-23, a `@Blueprint` block the blueprint index reads (index row 186); the three `// @FollowsBlueprint middleware-request-tracing` at :18 of each copy | PASS |
| B21 | Standards checklist (10-testing): "a test name states the behaviour and the condition" | read changed tests | talos wide-event.adapter.test.ts:41 `'…the outcome, and sets the same fields on the active span'` (round-1 B13 fixed); new banana-rush and talos tests at wide-event.middleware.test.ts:101 name both conditions; weak-points.core.test.ts `'reads weak-point %s as no weak point'` | PASS |
| B22 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C12 | @borso-app/last-loop-lepin | `pnpm --filter @borso-app/last-loop-lepin run test:e2e --changed origin/main --reporter=verbose` | 0 (13 files, 62 tests) | PASS |
| C13 | @borso-app/banana-rush | `pnpm --filter @borso-app/banana-rush run test:e2e --changed origin/main --reporter=verbose` | 0 (5 files, 43 tests) | PASS |
| C14 | @borso-app/talos | `pnpm --filter @borso-app/talos run test:e2e --changed origin/main --reporter=verbose` | 0 (21 files, 112 tests) | PASS |
| C15 | last-loop-lepin, banana-rush, talos, pragma | `pnpm --filter <pkg> exec vitest run --project core --changed e61949698 --coverage --reporter=verbose` | 0 ×4 (no core file changed in last-loop-lepin and banana-rush; talos 1 file, 8 tests; pragma 2 files, 10 tests) | PASS |
| C16 | root `scripts/` | `pnpm exec vitest run scripts/quality/weak-points.core.test.ts` | 0 (1 file, 48 tests) | PASS |
| C17 | gated files since round 1 | `scripts/mutate-changed.sh e61949698735005dd2b974719f7ab6f39fee1547` | 0. One run over `weak-points.core.ts`, score 100.00, 146 killed, 3 timeout, 0 survived | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D27 | UC4 wide event's `trace.id`, last-loop-lepin | `it('carries the id of the trace the request span belongs to, and leaves it out when none is active')` apps/last-loop-lepin/api/src/helpers/observability/wide-event.middleware.test.ts:101 → :108 `expect(tracedEvent).toMatchObject({ 'trace.id': TRACE_ID });` | PASS |
| D28 | UC4 wide event's `trace.id`, banana-rush (round-1 D08) | same test, apps/banana-rush/api/src/helpers/observability/wide-event.middleware.test.ts:101 → :108 and :109 | PASS |
| D29 | UC4 wide event's `trace.id`, talos (round-1 D08) | same test, apps/talos/api/src/helpers/observability/wide-event.middleware.test.ts:101 → :108 and :109 | PASS |
| D30 | UC4 the mounted middleware reads the active span, not a stub | structural: `export const recordWideEvents = buildWideEventRecording(findActiveTraceId);` at wide-event.middleware.ts:38 in all three; `findActiveTraceId` itself is pinned by `'reads the trace id of the active span'` in each error-reporting.adapter.test.ts (round-1 D08 evidence) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E04 | Database writes | Check-then-write | `git diff e61949698..HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` is empty. No write path | PASS |
| E05 | Module-level state | Per-process state | the only module-level value added is `export const recordWideEvents = buildWideEventRecording(findActiveTraceId);` (×3), an immutable middleware; `NO_WEAK_POINT` in `scripts/` is a constant. No spec rule depends on it | PASS |

## Blocking findings

- none. C02 and D07 from round 1 are fixed (R01, R02).

## Non-blocking findings

- none new. Round-1 B12, B13 and D08 are fixed by `bece68f92`. Round-1 D19 (no stack test sets a DSN without a release) is untouched by this diff and stays as reported.

## Notes

- A00 — no plan exists. The ADR stands in for it and now links the spec (A22).
- The three copies keep `// @FollowsBlueprint middleware-wide-event` on a `buildWideEventRecording` factory, while the blueprint, pragma's wide-event.middleware.ts, is still a `recordWideEvents: MiddlewareHandler` constant that imports `findActiveTraceId` directly. Should pragma take the same factory shape, so the blueprint and its followers answer the trace-id question one way?
- `f1ce5a5dd` changes `scripts/quality/weak-points.core.ts` and pragma's manifest, which sit outside this feature. It fixes a gate that stopped `scripts/reports.sh`, per the repo's "fix the failures you find" rule. Is it meant to ride this pull request?

## Verdict: PASS_EXCEPT_UNVERIFIABLE
