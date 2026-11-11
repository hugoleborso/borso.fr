# Technical validation — pragma's API cold start

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (Tier 1 chain under `/route`; ADR-202611111658 carries the decision). No row below depends on it.
- Branch: `claude/bold-mccarthy-p7kh0q`
- Base: `origin/main`
- Run at: 2026-11-11T18:18:31Z
- Round: 2
- Reviewed: 9f9441312fa8fa69889cfff52f47be439e3dfb60
- Touched workspaces: `@borso-app/pragma` (api + cdk), `@borso/infra` (infra/cdk), `docs/`

Preamble. Round 2 reviews `git diff dc9cd9077e266c8e7304967ee0db6742b57416da..HEAD` only, plus one
row per round-1 finding. That diff is two commits and eight files: `apps/pragma/api/src/main.test.ts`
(new), `apps/pragma/cdk/lib/stack.ts`, `apps/pragma/cdk/test/stack.test.ts`,
`apps/pragma/vitest.config.ts`, `infra/cdk/src/internal/source-map-upload.utils.ts`, the ADR, the
spec (added in this window) and round 1's own report. The spec is still in the short form, and it
now carries the *How it will be judged* section that round 1's A12 asked about. Nothing is routed
to `/visual-validation`: 0 use cases routed, the change has no browser surface. No round-1 finding
was dismissed; the commit message accepts all four and names the fix for each, so every row below
is a fix check rather than a claim check.

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | A06 — `--enable-source-maps` dropped unconditionally while the map is deleted only on success, so a failed upload ships minified frames silently | `9f94413` apps/pragma/cdk/lib/stack.ts:104 and :112 — `const SOURCE_MAPPED_STACK_TRACES = '--enable-source-maps';` / `NODE_OPTIONS: SOURCE_MAPPED_STACK_TRACES,` inside `buildErrorReportingEnvironment`. `git diff origin/main...HEAD -- apps/pragma/cdk/lib/stack.ts` now shows only the new `sourceMapUpload` prop and its spread, so the flag is byte-for-byte what `main` had. The round-1 failing case (revoked token → `\|\| true` swallows the failure → map survives → nothing reads it) no longer holds: the map survives *and* the flag reads it, which is today's behaviour. Probed that the other half is safe too, since the flag now outlives the map on a successful upload: `node --enable-source-maps index.mjs` with `//# sourceMappingURL=index.mjs.map` and no map file prints the stack and exits 0, with no warning (Node v22.23.4) | PASS |
| R02 | D03 — no test asserts the degraded path, and `stack.test.ts` asserted the opposite | `9f94413` apps/pragma/cdk/test/stack.test.ts:427 and :431 — `NODE_OPTIONS: '--enable-source-maps',` inside the prod `toMatchObject`, and `expect(readApiVariables('preview')).not.toHaveProperty('NODE_OPTIONS');`. The `it('asks Node to read no source map, at either stage, since none ships')` block is gone. `git diff origin/main...HEAD -- apps/pragma/cdk/test/stack.test.ts` is empty, so the test file is back to `main`'s and the flag is pinned against a real synth | PASS |
| R03 | D08 — nothing covered "one invocation performs one flush"; deleting `await flushErrorReports()` left the suite green | `9f94413` apps/pragma/api/src/main.test.ts (new, 5 tests) plus `apps/pragma/vitest.config.ts:15` and `:82` adding `'api/src/main.test.ts'` to `PURE_TEST_FILES` and to the `core` project's `include`. The round-1 failing case is now caught: `expect(flushErrorReports).toHaveBeenCalledOnce();` at main.test.ts:62 runs after `await handler(HTTP_EVENT)` at :59 with the adapter mocked, so removing `await flushErrorReports();` at main.ts:46 leaves the mock uncalled and that assertion fails; :78 catches the same deletion on the throwing path. Run here: `vitest run --project core api/src/main.test.ts` → 5 passed, exit 0 | PASS |
| R04 | B17 (non-blocking) — `sourceMapUpload: props.sourceMapUpload` passed an explicit `undefined` against the `app-cdk-stack` blueprint description the file itself carries | `9f94413` apps/pragma/cdk/lib/stack.ts:224 — `...(props.sourceMapUpload === undefined ? {} : { sourceMapUpload: props.sourceMapUpload }),`, matching the sibling spreads at :216-217. The blueprint description at :180 is true of the file again | PASS |
| R05 | B18 (non-blocking) — `quote` does POSIX shell escaping and says neither | `9f94413` infra/cdk/src/internal/source-map-upload.utils.ts:14 — `function shellQuote(value: string): string`, with all four call sites renamed at :22-23. No other change to the module | PASS |
| R06 | A12 (UNVERIFIABLE) — the spec asked the operator to read the saving on the preview, where `readSourceMapUpload()` returns undefined | `4e1720b` spec.md *How it will be judged* now reads "Not the preview… The measurement lands on the prod deploy, by comparing a cold start's `InitDuration` against the 1259 ms recorded on 2026-11-11, unless the operator exposes those two variables to the preview job first." That matches `.github/workflows/preview.yml:157-161` ("the org and the project are variables of the prod environment, which this job does not name, so they read as empty here") against `apps/pragma/cdk/bin/cdk.ts:50` (`if (organization === undefined \|\| project === undefined) return undefined;`). The spec no longer asserts a measurement the preview cannot produce | PASS |

## A. Correctness vs spec

Rows cover the spec claims the new commits changed. Claims round 1 already graded PASS on code this
diff does not touch are not re-walked.

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | What this change does 1 | "`--enable-source-maps` stays, so a failed upload leaves exactly today's behaviour" | apps/pragma/cdk/lib/stack.ts:104, :110-113 | `const SOURCE_MAPPED_STACK_TRACES = '--enable-source-maps';` and `return { SENTRY_DSN: project.dsn, NODE_OPTIONS: SOURCE_MAPPED_STACK_TRACES, ...(project.release === undefined ? {} : { SENTRY_RELEASE: project.release }) };`. The upload command at source-map-upload.utils.ts:26 still deletes only on success (`${SENTRY_CLI} sourcemaps upload ${target} ${directory} && rm -f ${directory}/*.map \|\| true`), so the failed-upload state is map present + flag set | PASS |
| A02 | Assertions 2 | "The map is deleted only when the upload succeeded, and `--enable-source-maps` stays set" | source-map-upload.utils.ts:26; stack.ts:112 | Both halves above. The successful-upload state (flag set, no map) was probed, not assumed: a module whose `sourceMappingURL` names a missing file runs under `--enable-source-maps` with no warning and exit 0 on Node v22.23.4 | PASS |
| A03 | Assertions 4 | "Every interpolated value is shell-quoted" — unchanged by the rename | source-map-upload.utils.ts:14, :22-23 | `` return `'${value.replaceAll("'", `'\\''`)}'`; `` reached through `shellQuote(outputDirectory)` and `--org ${shellQuote(upload.organization)} --project ${shellQuote(upload.project)} --release ${shellQuote(upload.release)}`. The rename is the only edit to the file; the emitted strings are identical, which the unchanged exact-match tests pin | PASS |
| A04 | How it will be judged | "a preview installs no hook and ships its map as before" | apps/pragma/cdk/bin/cdk.ts:46-53; .github/workflows/preview.yml:156-169 | `const organization = readOptionalSetting('SENTRY_ORG'); … if (organization === undefined \|\| project === undefined) return undefined;` against the workflow's in-place statement that `SENTRY_ORG` and `SENTRY_PROJECT` belong to the prod environment the preview job does not name. The spec's judgement now lands on the prod deploy | PASS |
| A05 | ADR-202611111658 (the spec's decision record) | The ADR's Decision and option table agree with the shipped behaviour | docs/adr/202611111658-…md Decision, Consequences, Option A, comparison table | Decision now reads "`--enable-source-maps` stays set. It costs 20 ms against the map's 91 ms, and it is what makes a failed upload degrade to today's behaviour instead of shipping minified frames silently"; Consequences now says "roughly 310 ms"; the table's Option A cell says "roughly 310 ms" and Option B "330 ms, by also dropping the flag". `scripts/check-adr-criteria.sh`, `check-adr-numbers-resolve.sh` and `check-dated-records-are-append-only.sh` each exit 0 | PASS |

## B. Code cleanliness

Scope is the five files the round-2 diff touches. Files round 1 read in full are re-read only
where the diff changed them; no new non-blocking finding is raised on code round 1 already read.

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Lint clean | `pnpm exec oxlint --type-aware apps/pragma/api/src/main.test.ts apps/pragma/cdk/lib/stack.ts apps/pragma/cdk/test/stack.test.ts apps/pragma/vitest.config.ts infra/cdk/src/internal/source-map-upload.utils.ts` | exit 0, no warning (`denyWarnings` on) | PASS |
| B02 | Typecheck | `pnpm --filter @borso/infra run typecheck`; `pnpm --filter @borso-app/pragma run typecheck` | exit 0 and exit 0 | PASS |
| B03 | No `any` | `grep -nP '\bany\b'` on the five changed files | no hit | PASS |
| B04 | Type assertions limited to `as const` / `as unknown` | `grep -nE ' as [A-Za-z]'` on the changed source files | one hit, inside the `@BlueprintDescription` prose at stack.ts:180; no assertion added. `main.test.ts` types its events through `Parameters<Handler>[0]` (:34) rather than asserting | PASS |
| B05 | No prose comments (`borso/no-comments`) | `git diff dc9cd90..HEAD -- '*.ts' \| grep -E '^\+' \| grep -E '//\|/\*'` | no hit | PASS |
| B06 | Magic strings extracted to named constants | read stack.ts:104-113 in full | `'--enable-source-maps'` is bound to `SOURCE_MAPPED_STACK_TRACES` rather than inlined; `main.test.ts` imports `STREAK_REMINDER_JOB` from `../../domain/scheduled-job.core` (:2) instead of repeating the job name | PASS |
| B07 | Names carry intent; no abbreviations or single-letter locals | read the five files in full | `shellQuote`, `SOURCE_MAPPED_STACK_TRACES`, `loadHandler`, `reminderClocks`, `HTTP_EVENT`, `REMINDER_EVENT`; no abbreviation, no single-letter local | PASS |
| B08 | `noUncheckedIndexedAccess` honoured | read added lines for index access | `main.test.ts:87` reads `reminderClocks.at(0)` rather than `[0]`; no bare index access added | PASS |
| B09 | `useEffect` is a smell | `grep -nE '\buseEffect\('` on the changed `.ts`/`.tsx` | none found (no front-end file in the round-2 diff) | PASS |
| B10 | Standards 10: "a test name states the behaviour and the condition" | read apps/pragma/api/src/main.test.ts in full | `it('flushes once for one HTTP invocation, whatever the request did')` (:56), `it('flushes even when the HTTP handler throws, so the report is not lost')` (:71), `it('runs the streak reminder on its own event, and flushes that invocation too')` (:81), `it('reports and rethrows a failing streak reminder, then flushes')` (:92). Each names the condition and the behaviour | PASS |
| B11 | Standards 10: "a service test asserts on what the database holds rather than on which method was called" | read main.test.ts in full | The assertion under test is "one invocation performs one flush", whose only observable is the call on the Sentry transport; `main.ts` touches no table on either path. The call-count assertions are the behaviour here, not a proxy for it | PASS |
| B12 | Blueprint `app-cdk-stack`: "hands them to `PreviewableApp` through conditional spreads so an absent prop is never passed as an explicit `undefined`" | read apps/pragma/cdk/lib/stack.ts:213-230 against the description the file carries at :180 | `...(props.sourceMapUpload === undefined ? {} : { sourceMapUpload: props.sourceMapUpload }),` at :224, beside the identically shaped `prNumber` and `domainName` spreads at :216-217 | PASS |
| B13 | Blueprint `api-lambda-entrypoint` / `workspace-test-config` | read apps/pragma/api/src/main.ts:33-48 and apps/pragma/vitest.config.ts:10-19, :72-90 | `main.ts` still carries `// @FollowsBlueprint api-lambda-entrypoint` (:33). The new include is added to both `PURE_TEST_FILES` (:15) and the `core` project's `include` (:82), which is what the `workspace-test-config` blueprint's description requires so the file is not also picked up by `back-e2e` (its `exclude` is `PURE_TEST_FILES`, :102) | PASS |
| B14 | Dependency bookkeeping (`knip`) | `pnpm knip` | exit 0; 8 configuration hints, all pre-existing (`.css` project patterns, an `api/scripts` entry pattern). The round-2 diff adds no dependency | PASS |
| B15 | Repository consistency gates the diff touches | `scripts/check-adr-criteria.sh`, `check-adr-numbers-resolve.sh`, `check-named-paths-exist.sh`, `check-dated-records-are-append-only.sh`, `check-coupled-lists.sh` | exit 0 each. The edited ADR still passes the append-only check, and every path the new spec names resolves | PASS |

## C. Tests pass

`apps/pragma/vitest.config.ts` is in `forceRerunTriggers` (`CONFIG_FILES_THAT_RERUN_EVERY_TEST`,
vitest.config.ts:6), so `--changed` expands to the whole pragma suite in this round rather than to a
subset. Both pragma runs below are therefore complete, not scoped.

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed dc9cd90 --reporter=verbose --coverage` | 0 — 405 files, 3997 tests. Includes `api/src/main.test.ts` and `cdk/test/stack.test.ts`. The coverage report is empty because no file in the coverage `include` list (`*.core.ts`, `*.utils.ts`, `*.adapter.ts`, `*.schema.ts`) was executed-and-changed in this window; `main.ts` is an entry point and has never been in that list | PASS |
| C02 | @borso-app/pragma (back e2e) | `pnpm --filter @borso-app/pragma run test:e2e --changed dc9cd90` | 0 — 52 files, 456 tests, local Postgres booted. `main.test.ts` is excluded from this project through `PURE_TEST_FILES`, so it does not run twice | PASS |
| C03 | @borso-app/pragma (the new file alone) | `pnpm --filter @borso-app/pragma exec vitest run --project core api/src/main.test.ts --reporter=verbose` | 0 — 5 tests, 1 file, confirming the config change actually picks the file up | PASS |
| C04 | @borso/infra | `pnpm --filter @borso/infra exec vitest run --changed dc9cd90 --reporter=verbose --coverage` | 0 — coverage 100% statements / branches / functions / lines on the changed file (11/11, 2/2, 7/7, 11/11), per-file thresholds at 100 | PASS |
| C05 | gated files changed in this round | `scripts/mutate-changed.sh dc9cd9077e266c8e7304967ee0db6742b57416da` | 0 — 1 run. `source-map-upload.utils.ts`: 29 killed, 0 survived, score 100.00 against break threshold 100 | PASS |
| C06 | both | Every `*.utils.ts` still has a sibling `*.utils.test.ts` | The round-2 diff adds no `*.utils.ts`; the one it edits (`source-map-upload.utils.ts`) keeps its sibling `source-map-upload.utils.test.ts`, which C04 and C05 both ran | PASS |

## D. Test coverage of spec

Rows cover the two assertions whose coverage the round-2 diff changed. The other four were graded
in round 1 on tests this diff does not touch.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | Assertions 2, second half: "`--enable-source-maps` stays set. A bad token or a network blip therefore leaves the map in the bundle and the flag reading it" | `it('hands the error reporting project and release to the API only when one is configured')` at apps/pragma/cdk/test/stack.test.ts:423; the assertion that would fail is `NODE_OPTIONS: '--enable-source-maps',` at :427, inside a `toMatchObject` on `readApiVariables('prod')` read off a real synthesised template, with `expect(readApiVariables('preview')).not.toHaveProperty('NODE_OPTIONS');` at :431 pinning the other stage. The first half ("deleted only when the upload succeeded") stays covered by `it('keeps the map when the upload fails, so a deploy never loses it everywhere at once')` at infra/cdk/src/internal/source-map-upload.utils.test.ts:22 | PASS |
| D02 | Assertions 6, first half: "One invocation performs one flush" | `it('flushes once for one HTTP invocation, whatever the request did')` at apps/pragma/api/src/main.test.ts:56; the assertion that would fail is `expect(flushErrorReports).toHaveBeenCalledOnce();` at :62. Three more pin the rest of the surface: :78 on the throwing HTTP path, :89 on the scheduled streak reminder (`expect(httpHandler).not.toHaveBeenCalled();` at :88 keeps the two paths apart), :99 on the failing reminder | PASS |
| D03 | Assertions 6, second half: "`traceIncomingRequest` performs none" | `it('answers inside a server span continuing the caller trace, and leaves the flush to the invocation')` at apps/pragma/api/src/helpers/observability/error-reporting.adapter.test.ts:154; the assertion that would fail is `expect(sentry.flush).not.toHaveBeenCalled();` at :177. Unchanged this round; re-listed because round 1's D08 found it was the suite's *only* flush assertion, and D02 above is now the matching positive | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Does the round-2 diff write to a database? | `git diff dc9cd90..HEAD --name-only -- '*.service.ts' '*.repository.ts' '*.controller.ts' '*.queries.ts'` lists no file, and no added line matches `\b(insert\|update\|delete\|onConflict\|transaction)\(`. No check-then-write exists to race | PASS |
| E02 | per-process state | Does the round-2 diff add state a Lambda instance holds? | The only module-level additions are `const SOURCE_MAPPED_STACK_TRACES = '--enable-source-maps';` (a synth-time constant, stack.ts:104) and the mocks and fixtures in `main.test.ts`. `NODE_OPTIONS` is a per-container environment variable, identical on every instance, so no rule depends on one instance's copy. The flush itself still runs once per invocation in `handler`'s `finally` (main.ts:45-47), before the container can freeze | PASS |

## Blocking findings

- none.

## Non-blocking findings

- none.

## Notes

> *One bullet per UNVERIFIABLE row, plus any concern that has no failing case yet, phrased as a question.*

- No UNVERIFIABLE row this round. Round 1's A12 is resolved by the spec's new *How it will be judged* section, which states the preview cannot show the saving and moves the measurement to the prod deploy (R06).
- The premise under R06 is still in-repo evidence only. `preview.yml:157-161` says `SENTRY_ORG` and `SENTRY_PROJECT` are prod-environment variables, and the GitHub variables API is blocked for this session (HTTP 403), so whether they are also set at repository level is unprobed. If they are, a preview deploy would install the hook and upload a map tagged with the PR's SHA. Nothing breaks if it does, since the flag now stays and the delete is still conditional, so this is a question rather than a finding: does the operator want those two variables exposed to the preview job, and if so should the release tag distinguish a preview from prod?
- `sentry-cli sourcemaps inject` rewriting `index.mjs` after esbuild and before CDK hashes the asset still runs for the first time on the first real pragma deploy from this branch. Should the PR body say so, so the operator watches that deploy rather than a later one?
- The plan is absent by design (Tier 1 chain), per the dispatching brief. No row above needed it.

## Verdict: PASS
