# Technical validation — Every app traces to Sentry as pragma does (kaizen sweep of PR #295)

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: none. [ADR-2026-11-11T1903](../../../../adr/2026-11-11T1903-every-app-traces-to-sentry-at-full-rate.md) lists the implementation pointers.
- Branch: claude/lessons-from-pr-295
- Base: origin/main
- Run at: 2026-11-11T23:27:16Z
- Round: 1
- Reviewed: 59b8838f576b0b1a6c39acbd46b68ccd85c014c7
- Touched workspaces: @borso-app/last-loop-lepin (api), @borso-app/talos (vitest config only), repository tooling (`.oxlintrc.json`, `scripts/lint-staged-files.sh`, `eslint-rules/disable-directives.test.js`, `.github/workflows/preview.yml`)

The spec is PR #295's, in the short form (Goal, Use cases, Out of scope). That PR is merged, so this round does not re-review its code. This branch is the kaizen sweep of PR #295. Its code touches one spec use case (5, a 500 is reported and flushed, in last-loop-lepin). Its other changes are the eradications its `docs/features/meta/lessons-from-pr-295/inventory.md` decides. Category A takes its rows from use case 5 and from each inventory decision that ships code. Category D takes the same rows. Nothing is routed to `/visual-validation`. No changed file is a gated `.core`, `.utils`, `.adapter` or `.schema` module, so `scripts/mutate-changed.sh` has nothing to mutate.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | plan | A plan exists to check the file list against | `docs/features/meta/sentry-tracing-all-apps/plan/plan.md` | file absent. The ADR's *Implementation pointers* stand in. No row below depends on the plan | UNVERIFIABLE |
| A01 | UC5, inventory 05 | last-loop-lepin's composition root answers an unhandled failure with 500 and reports it, so the tests and the Lambda run one app | apps/last-loop-lepin/api/src/app.ts:24 | `.onError(answerUnhandledError)` in the chain after `.use('*', cors())`, the same position as apps/pragma/api/src/app.ts:69 | PASS |
| A02 | UC5 | The reported failure goes to Sentry, a deliberate `HTTPException` does not | apps/last-loop-lepin/api/src/helpers/observability/unhandled-error.middleware.ts:12-18 | `if (error instanceof HTTPException) { … return context.newResponse(refusal.body, refusal); } reportFailure(error); return context.text(INTERNAL_SERVER_ERROR_BODY, INTERNAL_SERVER_ERROR_STATUS);` | PASS |
| A03 | UC5 | Sentry is flushed before the Lambda returns, the 500 included | apps/last-loop-lepin/api/src/helpers/observability/error-reporting.adapter.ts:103-108 | `await Sentry.withIsolationScope(() => Sentry.continueTrace(…, () => answerInRequestSpan(request, answer)));` then `await Sentry.flush(FLUSH_TIMEOUT_MILLISECONDS);`. `traceRequests` is the first middleware (app.ts:21), so it wraps the error handler's answer | PASS |
| A04 | UC5 | The entrypoint still starts reporting before the app is built, and attaches no second handler | apps/last-loop-lepin/api/src/main.ts:13-15 | `startErrorReporting(selectErrorReportingSettings(readErrorReportingInputs()));` / `const app = createApp();` | PASS |
| A05 | inventory 02-04 | A bare `oxlint` runs the type-aware rules, so a hand-typed gate equals the scripted one | .oxlintrc.json:34 | `"typeAware": true,`. Measured: `node_modules/.bin/oxlint apps infra eslint-rules scripts` with no flag exits 0 in 28 s, with every type-aware directive in the tree judged used | PASS |
| A06 | inventory 02-04 | The plugin half of the staged-file lint keeps type information off, so it still builds no TypeScript program | scripts/lint-staged-files.sh:160-164 | `JSON.stringify({ ...pluginsHalf, plugins: [], options: { ...pluginsHalf.options, typeAware: false } })`. Measured: the script exits 0 on three last-loop-lepin and talos TypeScript files (1.2 s) and on one JavaScript file (1.0 s) | PASS |
| A07 | inventory 02-04 | The planted fixture that the type-aware config now reports re-exports its import instead of assigning it | eslint-rules/disable-directives.test.js:42 | `'export { normalizeJoinCode };',`. The test file passes 6 of 6 | PASS |
| A08 | inventory 09 | `vi.mock` is refused in every API test file a back-e2e project runs, and allowed in the isolated core tests | .oxlintrc.json:979-1004 | override on `["apps/*/api/src/**/*.test.ts", "apps/*/test/**/*.test.ts"]` sets `{ "object": "vi", "property": "mock", … }`, then core, utils, adapter and schema tests, pragma `main.test.ts` and talos `main.export.test.ts` get `"off"`. Probe in the scratch folder with the two overrides: `a.test.ts`, `test/b.test.ts` and `mod.integration.test.ts` are refused at `2:1`, `a.core.test.ts` and `a.adapter.test.ts` are not | PASS |
| A09 | inventory 09 | talos's `main.export.test.ts`, which mocks the export adapter, runs in the isolated core project and not in back-e2e | apps/talos/vitest.config.ts:48, :68 | `'api/src/main.export.test.ts',` added to core `include` and to back-e2e `exclude`. The verbose core run lists `|core| api/src/main.export.test.ts > the export job handler > …` twice, both passing | PASS |
| A10 | inventory 12 | A preview's comment says Sentry is off when its DSN is empty | .github/workflows/preview.yml:423-425, job env at :162 | `if [ -z "$VITE_SENTRY_DSN" ]; then note="$note · Sentry off, so no error or trace from this preview reaches Sentry"`. `VITE_SENTRY_DSN` is job-level env, so the `meta` step sees it. Measured by running the step's script: empty DSN appends the sentence, a set DSN leaves the note unchanged. `actionlint` exits 0 | PASS |
| A11 | inventory 24 | ADR-2026-11-11T1903 reads `accepted`, in the file and in the index | docs/adr/2026-11-11T1903-every-app-traces-to-sentry-at-full-rate.md:3, docs/adr/README.md:114 | `- **Status:** accepted` / `… lands on its request span \| accepted \| 2026-11-11 \|` | PASS |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations or one-letter locals | read the changed TypeScript and JavaScript in full | `writtenEvents`, `writtenEvent`, `pluginsHalf`, `answerUnhandledError`. None found | PASS |
| B02 | Magic numbers and strings extracted | read in full | the test's `500` and `'Internal Server Error'` are assertion values. app.ts keeps `TEST_SEED_FLAG` constants. None found | PASS |
| B03 | No prose comments in code (`borso/no-comments`) | read in full | none added to `.ts` or `.js`. The JSDoc in main.ts:7-12 is the pre-existing machine-read blueprint tag | PASS |
| B04 | Type assertions only `as const` and `as unknown` | `grep -n ' as ' <changed .ts/.js>` | none found | PASS |
| B05 | No `any` | `grep -nP '\bany\b' <changed .ts/.js>` | none found | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read in full | the only index is the destructured `([line])` of `write.mock.calls`, passed to `String(line)`, which takes `undefined` | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware` on app.test.ts, app.ts, main.ts, talos vitest.config.ts, main.export.test.ts, disable-directives.test.js | exit 0. Bare `oxlint apps infra eslint-rules scripts` also exit 0 | PASS |
| B08 | knip clean | `pnpm exec knip` | exit 0, configuration hints only | PASS |
| B09 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on changed files | none in the changed source. The only hit is the planted fixture string in disable-directives.test.js:55, which exists to be refused | PASS |
| B10 | Standards checklist: "a comment documents something the code cannot say, and is not a restatement, a history note, or a description of what the code does not do" (01-naming) | read `.github/workflows/preview.yml` in full around the change | `# empty and nothing a preview does reaches Sentry. PR #295 planned` / `# to prove tracing on its preview before it learned that.` at .github/workflows/preview.yml:419-420 is a history note, and its first sentence restates the job-env comment at :157-161 ("they read as empty here and previews run with Sentry off"). Introduced: this branch. Fix size: one file, drop the comment's first two sentences | FAIL (non-blocking) |
| B11 | Standards checklist: a test name states the behaviour and the condition (10-testing) | read app.test.ts in full | `it('answers 500 and records the failure when a route throws past every middleware'` at apps/last-loop-lepin/api/src/app.test.ts:82 names both | PASS |
| B12 | Standards checklist: a file name says what it holds, verb table (`find…`, `build…`, `select…`) (01-naming) | read in full | no file added under `apps/` or `infra/`. No function added | PASS |
| B13 | Blueprint shape of the composition root | compare with `@Blueprint api-composition-root` at apps/pragma/api/src/app.ts:55-69 | apps/last-loop-lepin/api/src/app.ts:18-35 now matches pragma: middlewares, then `.onError(answerUnhandledError)`, then routes, in one chain | PASS |
| B14 | Shell script sound | `bash -n scripts/lint-staged-files.sh` | exit 0 | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/last-loop-lepin core | `pnpm --filter @borso-app/last-loop-lepin exec vitest run --project core --changed origin/main --coverage --reporter=verbose` | 0. 76 files, 865 tests. No gated file changed, so coverage reports 0/0 | PASS |
| C02 | @borso-app/last-loop-lepin back-e2e | `pnpm --filter @borso-app/last-loop-lepin run test:e2e --changed origin/main --reporter=verbose` | 0. 29 files, 144 tests, `api/src/app.test.ts` 6 of 6 including the new 500 case | PASS |
| C03 | @borso-app/talos core | `pnpm --filter @borso-app/talos exec vitest run --project core --changed origin/main --coverage --reporter=verbose` | 0. 136 files, 1077 tests. The config change reruns every core file through `forceRerunTriggers` | PASS |
| C04 | repository tooling | `pnpm exec vitest run eslint-rules/disable-directives.test.js --reporter=verbose` | 0. 6 of 6 | PASS |
| C05 | `*.utils.ts` in touched workspaces | `git diff --name-only origin/main...HEAD \| grep utils` | no `*.utils.ts` changed, and each touched workspace has its runner | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | UC5, last-loop-lepin: a failure through `createApp` is reported to Sentry | `it('answers 500 and records the failure when a route throws past every middleware'` at apps/last-loop-lepin/api/src/app.test.ts:82 asserts only `expect(response.status).toBe(500)` (:91), the body, and `outcome: 'failed'` (:98). Hono's default error handler gives the same 500, the same `Internal Server Error` body and the same `c.res.status` to the wide-event middleware (measured with a Hono 4.13.7 probe in the scratch folder). Failing case: delete `.onError(answerUnhandledError)` from app.ts:24, and every test still passes while a thrown route error in prod is no longer sent to Sentry. Inventory row 05 states the same. The unit test at unhandled-error.middleware.test.ts:20-28 (`expect(reportFailure).toHaveBeenCalledWith(failure)`) pins the handler, not its wiring into `createApp` | FAIL (non-blocking) |
| D02 | UC5: a 500 is answered and lands in the wide event as failed | apps/last-loop-lepin/api/src/app.test.ts:82-100, `expect.objectContaining({ 'http.response.status_code': 500, outcome: 'failed' })` at :98 | PASS |
| D03 | UC5: a deliberate refusal is not reported | `it('answers a deliberate refusal with its own response and reports nothing'` at unhandled-error.middleware.test.ts:31, `expect(reportFailure).not.toHaveBeenCalled()` at :39 | PASS |
| D04 | inventory 09: the `vi.mock` rule refuses a back-e2e test and spares a core test | structural: no test file plants a back-e2e `vi.mock`. The rule is the `.oxlintrc.json:979-1004` override, and the probe in A08 shows it refusing and sparing. The dantotsu records the same proof on the pre-fix `wide-event.middleware.test.ts` | PASS |
| D05 | inventory 02-04: a bare oxlint judges type-aware directives used | structural: `.oxlintrc.json:34`. `eslint-rules/disable-directives.test.js` runs the real configuration bare and passes 6 of 6 | PASS |
| D06 | inventory 12: the preview note | structural: a workflow step with no test harness. Its script was run with an empty and a set DSN (A10) | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Does the diff write to a database or keep state | `git diff origin/main...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` is empty. `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let '` on app.ts and main.ts finds nothing. The only module-level value moved is `answerUnhandledError`, a stateless handler | PASS |

## Blocking findings

- none

## Non-blocking findings

- B10 — the new preview.yml comment carries a history note and restates the job-env comment above it.
- D01 — no test fails if `.onError(answerUnhandledError)` leaves last-loop-lepin's `createApp`, so the move the branch makes is unpinned. The new test passes on Hono's default handler.

## Notes

- A00: the plan is absent. The branch is a kaizen sweep with no plan by design, and inventory row 16 ruled the same row a no-op for PR #295. No row depends on the plan. Copy this row into the pull request description to merge on PASS_EXCEPT_UNVERIFIABLE.
- Should the lint exemption list be coupled to the vitest projects? `.oxlintrc.json:992-999` repeats by hand which files the core projects isolate, and nothing compares the two, the class `scripts/check-coupled-lists.sh` exists for. Failing case: remove `'api/src/main.test.ts'` from `PURE_TEST_FILES` in apps/pragma/vitest.config.ts:15. pragma's `main.test.ts` then runs in back-e2e with its `vi.mock`, and the lint still exempts it by name. The reverse drift fails safe: pragma's core-only `tool-coverage.test.ts`, `stale-scope-coverage.test.ts` and `derived-read-roots.test.ts` are not exempt, so a `vi.mock` there would be refused for no reason. No standards bullet covers it, so it is a question here and not a row.
- D01 could be pinned without a module mock by observing Sentry, for example by starting a client with an in-memory transport in the test. Whether that is worth it is the implementer's call.

## Verdict: PASS_EXCEPT_UNVERIFIABLE
