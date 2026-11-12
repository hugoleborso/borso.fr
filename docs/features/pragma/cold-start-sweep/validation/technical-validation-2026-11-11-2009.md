# Technical validation — pragma's cold start, second sweep

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: [`../plan/plan.md`](../plan/plan.md) (absent, see A09)
- Branch: `claude/bold-mccarthy-p7kh0q`
- Base: `origin/main` (`2810b3b148a9999cfdbdaf6c8edc971d13dad11a`, also the merge base)
- Run at: 2026-11-11T20:17:28Z
- Round: 1
- Reviewed: af4f4b766db2821efbc754e635400f0de832ba74
- Touched workspaces: `@borso-app/pragma` (api), `docs/`

Preamble. The spec is in a short form: *Why*, *The levers*, *What it deliberately does not do*,
*Assertions*, *How it will be judged*. Category A is built from the five levers and the three
exclusions. Category D is built from the *Assertions* bullets, walked in order and split where a
bullet makes two claims. The files come from the diff.
`0 use cases routed to /visual-validation; out of scope for this report.`

The diff `origin/main...HEAD` is three commits and four files:
`apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts` (one line added),
`apps/pragma/api/src/helpers/observability/error-reporting.adapter.test.ts` (one line added),
`docs/features/pragma/cold-start-sweep/kaizen.md` and the spec. The working tree was clean at the
reviewed SHA.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Lever 1, spec.md:19 | "Sentry's runtime channel injection is turned off." | apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts:50 | `enableRuntimeChannelInjection: false,` inside `Sentry.init({` at :42. The installed SDK (`@sentry/aws-serverless` 11.6.0) reads it at `@sentry/node/build/esm/sdk/client.js:43`: `&& options.enableRuntimeChannelInjection !== false) {` then `registerDiagnosticsChannelInjection();`. The option is typed at `@sentry/node/build/types/types.d.ts:34`. The diff adds this one line and removes none. | PASS |
| A02 | Lever 2, spec.md:24 | "The AWS SDK core is bundled once." | no change in the diff | Failing case, measured. The bundle built at the reviewed SHA with the esbuild command of `lambda-cold-start/findings.md` (2 791 710 bytes) holds each package twice: `@smithy/core` 3.33.3 (218 inputs, 116 355 bytes) and 3.36.0 (215 inputs, 112 297 bytes), `@aws-sdk/core` 3.978.0 (65, 48 336) and 3.978.3 (60, 47 662), `@aws-sdk/nested-clients` 3.997.45 (79, 56 788) and 3.997.48 (79, 58 862). `git diff --name-only origin/main...HEAD -- package.json pnpm-lock.yaml pnpm-workspace.yaml apps/pragma/cdk infra` prints nothing. `findings.md` is not in the diff, so no number records the lever as dead either (spec.md:15-17). | FAIL (blocking) |
| A03 | Lever 3, spec.md:28 | "The database connection opens during init. ... A top-level `await` at the end of the entry point moves it into the init phase." | apps/pragma/api/src/main.ts:19-21, unchanged | `const app = createApp();` then `const httpHandler = handle(app);`. The module holds no top-level `await` and no call into `database/client.ts`. Failing case: a new container that receives `GET /api/me` opens its database connection inside the first invocation, as before the branch. `findings.md:92-105` records a different variant as dead ("Warming the DSQL connection before the heavy imports"). No number is recorded for the end-of-entry-point variant this spec names. | FAIL (blocking) |
| A04 | Lever 4, spec.md:32 | "postgres.js stops fetching array types." | apps/pragma/api/src/database/client.ts:54-63, unchanged | `return postgres({` ... `types: { bigint: postgres.BigInt },` `connection: { search_path: config.schemaName },` `});` with no `fetch_types` key. `postgres` 3.4.9 defaults it on at `src/index.js:460`: `fetch_types     : true,`, read at `src/connection.js:84`: `needsTypes = options.fetch_types`. Failing case: every new DSQL connection still issues the catalog query. `grep -rn fetch_types apps/pragma/api/src` prints nothing. No record in `findings.md`. | FAIL (blocking) |
| A05 | Lever 5, spec.md:35 | "A V8 compile cache ships in the asset." | no change in the diff | `grep -rniE 'compile.?cache' apps/pragma/api/src apps/pragma/cdk infra/cdk/src` prints nothing. Failing case: the deployed asset holds no cache, so each container compiles the 2.79 MB bundle again. `findings.md:112-115` still lists it under untested leads: "Nobody has tried it". | FAIL (blocking) |
| A06 | Exclusion, spec.md:41 | "It does not replace the AWS SDK with a hand-written signer." | apps/pragma/api/src/database/client.ts:5, :53, unchanged | `import { DsqlSigner } from '@aws-sdk/dsql-signer';` and `const signer = new DsqlSigner({ hostname: config.endpoint, region: config.region });`. The diff touches no file that imports an AWS SDK. | PASS |
| A07 | Exclusion, spec.md:43 | "It does not strip zod's locales." | none | `git diff --name-only origin/main...HEAD -- apps/pragma/cdk infra package.json` prints nothing, so no bundler setting, alias or dependency moved. | PASS |
| A08 | Exclusion, spec.md:45 | "It does not raise memory or buy provisioned concurrency." | none | Same command as A07. No file under `apps/pragma/cdk` or `infra` is in the diff. | PASS |
| A09 | Plan | plan absent; files taken from the diff | docs/features/pragma/cold-start-sweep/ | `ls docs/features/pragma/cold-start-sweep/` prints `kaizen.md` and `spec` only. | UNVERIFIABLE |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations / 1-letter locals | read of the two added lines | The branch adds no identifier of its own. `enableRuntimeChannelInjection` is the SDK's option name. | PASS |
| B02 | Lint clean | `pnpm exec oxlint --type-aware apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts apps/pragma/api/src/helpers/observability/error-reporting.adapter.test.ts` | exit 0, no output | PASS |
| B03 | Typecheck clean | `pnpm --filter @borso-app/pragma run typecheck` | exit 0 | PASS |
| B04 | No unused export or dependency | `pnpm exec knip` | exit 0, configuration hints only | PASS |
| B05 | No `any` | `grep -nP '\bany\b' <changed files>` | Two hits, both the matcher `expect.any(Function),` at error-reporting.adapter.test.ts:213 and :222, not the type, and not added by this branch. | PASS |
| B06 | Type assertions limited to `as const` and `as unknown` | `grep -nE ' as [A-Za-z]' <changed files>` | Only `const SHARED_PROJECT_APP_TAGS = { app: 'pragma' } as const;` at error-reporting.adapter.ts:26. | PASS |
| B07 | No prose comments | read in full | The added lines carry no comment. The file's comments are `@DependsOnExternal sentry` (:2), `// @FollowsBlueprint adapter-external-service` (:39) and one lint directive (:104), all machine-read. | PASS |
| B08 | Magic numbers / strings extracted | read of the added lines | The added value is the boolean of an SDK option. `FLUSH_TIMEOUT_MILLISECONDS = 2_000` (:8) and `REQUEST_SPAN_OPERATION` (:10) are named. | PASS |
| B09 | `noUncheckedIndexedAccess` honoured | read of the diff | The diff adds no index access. | PASS |
| B10 | `useEffect` is a smell | `grep -nE '\buseEffect\(' <changed files>` | no match, exit 1 | PASS |
| B11 | Function names describe the result | sample of the changed file | `startErrorReporting`, `flushErrorReports`, `findActiveTraceId`, `recordAttributesOnActiveSpan`, `traceIncomingRequest`. | PASS |
| B12 | Standards checklist, `01-naming.md`: "a `find…` returns `null` rather than a sentinel" | error-reporting.adapter.ts read in full | `export function findActiveTraceId(): string \| null {` and `return Sentry.getActiveSpan()?.spanContext().traceId ?? null;` at :83-84. | PASS |
| B13 | Standards checklist, `01-naming.md`: "a boolean name is not negated" | read in full | `const isReporting = Sentry.isInitialized();` at :121, the only boolean local. | PASS |
| B14 | Standards checklist, `01-naming.md`: "a file name says what the file holds" | read in full | `error-reporting.adapter.ts` holds every call into `@sentry/aws-serverless` and nothing else. | PASS |
| B15 | Standards checklist, `03-typing.md`: "a derived type is derived" | read in full | `type ReportingOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;` at :14. | PASS |
| B16 | Standards checklist, `12-linting-and-gates.md`: "the reason on a disable comment is a claim about that line which a reader can check" | read in full | :104 says "error-reporting.adapter.test.ts asserts this option". It does, `forceTransaction: true,` at error-reporting.adapter.test.ts:219. Introduced: pre-existing. | PASS |
| B17 | Standards checklist, `10-testing.md`: "a test name states the behaviour and the condition" | read of the changed test | `it('starts the SDK with every personal data category off and no trace header sent outward', () => {` at error-reporting.adapter.test.ts:53 now also pins `enableRuntimeChannelInjection: false,` (:72), which the name does not state. A regression on that option would be reported under a name about personal data. Introduced: this branch. Fix size: one line. | FAIL (non-blocking) |
| B18 | Blueprint shape | `.claude/skills/blueprint/blueprint-index.md`, `adapter-external-service` | The branch adds one option to an existing call and changes no export, import or module state, so the file's shape against its blueprint is what `origin/main` holds. | PASS |
| B19 | Remaining `reviewer` bullets (`VOCABULARY.md`, `02`, `04` to `09`, `11`, `14`) | read of the diff | Not applicable. The diff holds no `VOCABULARY.md`, no site file, no repository, no service, no database write, no i18n key and no pre-commit check. | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed origin/main --coverage --reporter=verbose` | 0. 8 files, 67 tests passed, among them `api/src/helpers/observability/error-reporting.adapter.test.ts` (14 tests), `api/src/main.test.ts` (5) and `api/src/helpers/observability/wide-event.adapter.test.ts` (8). Coverage 100% on statements (31/31), branches (12/12), functions (12/12) and lines (29/29). | PASS |
| C02 | @borso-app/pragma | `pnpm --filter @borso-app/pragma run test:e2e --changed origin/main --reporter=verbose` | 0. 50 files, 459 tests passed. | PASS |
| C03 | @borso-app/pragma | `scripts/mutate-changed.sh origin/main` | 0. `error-reporting.adapter.ts`: 49 mutants killed, 0 survived, 0 without coverage, score 100.00. | PASS |
| C04 | @borso-app/pragma | every `*.utils.ts` has a sibling `*.utils.test.ts` | 60 files (5 under `api/src`, 55 under `site/src`), 0 without a sibling. The core project includes `api/src/**/*.utils.test.ts` and `site/src/**/*.test.{ts,tsx}` (apps/pragma/vitest.config.ts:76-90). The branch touches none of them. | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | `Sentry.init` receives `enableRuntimeChannelInjection: false` (spec.md:50) | `describe('startErrorReporting')` / `it('starts the SDK with every personal data category off and no trace header sent outward')` at apps/pragma/api/src/helpers/observability/error-reporting.adapter.test.ts:53. Fails at `expect(sentry.init).toHaveBeenCalledWith({` (:56) through `enableRuntimeChannelInjection: false,` (:72). The mutation run of C03 killed the boolean's mutant. | PASS |
| D02 | `Sentry.init` receives every other option it received before (spec.md:50-51) | Same test. The object matched at :56-76 names `dsn`, `environment`, `release`, `initialScope`, `tracesSampleRate`, `tracePropagationTargets`, `dataCollection` and `integrations`, and the branch changed none of those lines. The absent release is pinned by `it('leaves the release to the SDK when none was given')` at :79, `expect(sentry.init.mock.calls[0]?.[0]).not.toHaveProperty('release');` (:82). | PASS |
| D03 | A warm-up that fails never fails the init (spec.md:52) | (none found). No warm-up exists at the reviewed SHA (A03), and no test in `api/src/main.test.ts` loads the entry point with a rejecting connection. | FAIL (blocking) |
| D04 | A warm-up that runs out of time never fails the init (spec.md:52) | (none found). No test loads the entry point with a connection that never settles. | FAIL (blocking) |
| D05 | After a failed warm-up the first request connects by itself, exactly as today (spec.md:52-53) | (none found). No test sends a first invocation after a failed or timed-out warm-up. | FAIL (blocking) |
| D06 | The warm-up is bounded well under Lambda's 10 second init limit (spec.md:54) | (none found). `grep -rniE 'warm.?up' apps/pragma/api/src` prints nothing, so there is no warm-up and no named bound to test. | FAIL (blocking) |
| D07 | The first invocation of an instance is still reported as a cold start (spec.md:55) | `describe('runInWideEvent')` / `it('marks only the first event of an instance as a cold start')` at apps/pragma/api/src/helpers/observability/wide-event.adapter.test.ts:69. A fresh module is imported at :71 and the test fails at `expect(readWrittenEvents(write)).toMatchObject([` `{ 'lambda.cold_start': true },` `{ 'lambda.cold_start': false },` (:76-78). At this SHA nothing runs between the module load and the first invocation. | PASS |
| D08 | The scheduled streak reminder keeps one flush per invocation (spec.md:56-57) | `describe('handler')` / `it('runs the streak reminder on its own event, and flushes that invocation too')` at apps/pragma/api/src/main.test.ts:82. Fails at `expect(flushErrorReports).toHaveBeenCalledOnce();` (:90). The failing reminder is pinned at :93, :100. | PASS |
| D09 | The HTTP path keeps one flush per invocation (spec.md:56-57) | `it('flushes once for one HTTP invocation, whatever the request did')` at apps/pragma/api/src/main.test.ts:57. Fails at `expect(flushErrorReports).toHaveBeenCalledOnce();` (:63). The throwing handler is pinned at :72, :79. | PASS |
| D10 | A compile cache that the runtime rejects leaves today's behaviour and fails nothing (spec.md:58-59) | (none found). No compile cache exists at the reviewed SHA (A05), and no test starts the bundle against a rejected cache. | FAIL (blocking) |
| D11 | No temporary timing probe is left in the code (spec.md:60) | **structural:** `git diff origin/main...HEAD -- apps infra \| grep -nE '^\+.*(performance\.now\|console\.time\|hrtime\|probe)'` prints nothing, exit 1. The only `performance.now()` in pragma's non-test API and CDK source is `const startedAt = performance.now();` at apps/pragma/api/src/helpers/observability/wide-event.middleware.ts:27, which feeds the wide event's duration field (:33) and is on `origin/main`. | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Does the diff write to a database or keep state? | It does neither. `git diff origin/main...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` prints 0 lines. `git diff origin/main...HEAD -- apps infra \| grep -nE '^\+.*(insert\(\|update\(\|delete\(\|onConflict\|transaction\()'` prints nothing. `grep -nE '^(let\|const) [a-zA-Z]+ = new (Map\|Set)\|^let ' apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts` prints nothing. The added line is `enableRuntimeChannelInjection: false,` (error-reporting.adapter.ts:50), an option read once per process by `Sentry.init`. | PASS |

## Blocking findings

- A02 — Lever 2 is neither shipped nor recorded as dead. The bundle at the reviewed SHA still holds two copies each of `@smithy/core`, `@aws-sdk/core` and `@aws-sdk/nested-clients`.
- A03 — Lever 3 is neither shipped nor recorded as dead. `main.ts` opens no connection during init.
- A04 — Lever 4 is neither shipped nor recorded as dead. `createDsqlClient` passes no `fetch_types`, so postgres.js keeps its default of `true`.
- A05 — Lever 5 is neither shipped nor recorded as dead. No compile cache is built or shipped.
- D03 — No test covers a warm-up that fails.
- D04 — No test covers a warm-up that runs out of time.
- D05 — No test covers the first request connecting by itself after a failed warm-up.
- D06 — No test or named bound covers the warm-up's time limit.
- D10 — No test covers a compile cache the runtime rejects.

## Non-blocking findings

- B17 — The test at error-reporting.adapter.test.ts:53 pins the new option under a name that speaks only of personal data and trace headers.

## Notes

> *One bullet per UNVERIFIABLE row, plus any concern that has no failing case yet, phrased as a question.*

- A09. The plan is absent, so no planned file list exists to compare the diff against. The file list of this report comes from the diff. Run `/technical-conception` if the remaining four levers are to be planned before they are written.
- The five blocking D rows share their cause with A03 and A05. Under spec.md:15-17 each lever ends one of two ways: it ships, or `lambda-cold-start/findings.md` records the number that killed it. A lever recorded as dead leaves its assertions without a subject (my reading of the spec, not a rule the spec states). A lever that ships needs the test its D row names.
- `git stash list` shows `stash@{0}: On claude/bold-mccarthy-p7kh0q: D probe wip`, touching `apps/pragma/api/src/database/client.ts` and `apps/pragma/api/src/main.ts`. It is not part of the reviewed SHA and was not reviewed. Read with `git stash show -p`, it holds a top-level `await openDatabaseConnection()` with no time bound and two `process.stdout.write` lines carrying `probe:` fields. If that work is committed as it stands, do D06 and D11 still hold?
- Does production log `Failed to register diagnostics-channel injection hooks` today, as spec.md:21-22 says? Production logs were not read this session. The SDK source is consistent with it (inferred): `@sentry/server-runtime-injection/build/esm/register.js:130-151` looks for `hook.js` beside the running file, falls back to a package specifier, and writes that warning when `mod.register` throws.
- Lever 1 turns off the injection that the SDK's own warning ties to "channel-based integrations". Does any span pragma reads in Sentry today come from one of them? If the registration already fails in production, the answer is no (inferred from the spec's claim, not measured).
- *How it will be judged* (spec.md:62-76) is a measurement on the pull request's preview and on production after the merge. Neither exists at the reviewed SHA, so no row grades it.

## Verdict: FAIL
