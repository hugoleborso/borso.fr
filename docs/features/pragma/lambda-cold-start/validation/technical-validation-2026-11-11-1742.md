# Technical validation — pragma's API cold start

- Spec: [`../spec/spec.md`](../spec/spec.md)
- Plan: absent (shipped as a Tier 1 chain under `/route`; ADR-202611111658 carries the decision)
- Branch: `claude/bold-mccarthy-p7kh0q`
- Base: `origin/main`
- Run at: 2026-11-11T17:56:12Z
- Round: 1
- Reviewed: dc9cd9077e266c8e7304967ee0db6742b57416da
- Touched workspaces: `@borso-app/pragma` (api + cdk), `@borso/infra` (infra/cdk), repository root (`package.json`, `pnpm-workspace.yaml`, `knip.json`, `pnpm-lock.yaml`), `docs/`

Preamble. The spec is in the short form: *Why*, *What this change does*, *What it
deliberately does not do*, *Assertions*, *How it will be judged*. It holds no
Q.O.D., no *Files to change* and no *Test strategy*. Category A is built from its
*What this change does* and *What it deliberately does not do* bullets plus its
*Assertions*, with the files taken from the diff. Category D is built from the
same *Assertions*, walked in order, split where a bullet makes two claims.
Nothing is routed to `/visual-validation`: 0 use cases routed, the change has no
browser surface. The plan is absent by design, per the dispatching brief; no row
below depends on it.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | What this change does 1 | "The handler's source map is uploaded to Sentry at bundling time" | infra/cdk/src/internal/source-map-upload.utils.ts:24-27, :34-36, constructs/lambda-api.ts:100 | `` `${SENTRY_CLI} sourcemaps inject ${directory} \|\| true` `` / `` `${SENTRY_CLI} sourcemaps upload ${target} ${directory} && rm -f ${directory}/*.map \|\| true` ``, run from `afterBundling: (_inputDirectory, outputDirectory) => [...]`, wired by `bundling: buildHandlerBundling(props.sourceMapUpload)` | PASS |
| A02 | What this change does 1 | "…and deleted from the asset" | source-map-upload.utils.ts:26 | `&& rm -f ${directory}/*.map` runs in the same shell command as the upload; esbuild writes `index.mjs.map` beside `index.mjs` for `OutputFormat.ESM`, which the glob matches | PASS |
| A03 | What this change does 1 | "`--enable-source-maps` is dropped for the app that uploads" | apps/pragma/cdk/lib/stack.ts:104-112 | `return { SENTRY_DSN: project.dsn, ...(project.release === undefined ? {} : { SENTRY_RELEASE: project.release }) };` — the `SOURCE_MAPPED_STACK_TRACES` constant and its `NODE_OPTIONS` entry are gone | PASS |
| A04 | What this change does 2 | "`Sentry.flush` moves from the request middleware to the invocation" | apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts:111 (removed), apps/pragma/api/src/main.ts:43-47 | `try { return await httpHandler(event, lambdaContext); } finally { await flushErrorReports(); }`; `traceIncomingRequest` now ends at the `withIsolationScope` call. `answerReadBatch` dispatches its inner reads through the injected `runRead` (read-batch.service.ts:28), so the 11 inner passes through the tracing middleware no longer flush | PASS |
| A05 | What it deliberately does not do | "It does not touch `banana-rush` or `talos` … nor the WebSocket and talos job Lambdas" | source-map-upload.utils.ts:40-50; grep over `apps/`, `infra/` | `buildHandlerBundling(undefined)` returns the exact former literal (`minify`, `sourceMap: true`, `target: 'node22'`, `format`, `mainFields`, `banner`) and spreads no `commandHooks`; `grep -rn sourceMapUpload apps infra` finds the prop only on pragma's stack; `--enable-source-maps` still present at apps/last-loop-lepin/cdk/lib/stack.ts:35 | PASS |
| A06 | Assertions 2 | "The map is deleted only when the upload succeeded. A bad token or a network blip degrades to today's behaviour rather than leaving the map nowhere." | apps/pragma/cdk/lib/stack.ts:104-112 against source-map-upload.utils.ts:26 | Deletion is correctly conditional (`upload && rm -f`). The degradation is not: `NODE_OPTIONS=--enable-source-maps` is removed unconditionally, not only when the upload succeeded. Failing case: deploy prod with a revoked `SENTRY_AUTH_TOKEN` (non-empty, so `readSourceMapUpload()` returns a target). `sentry-cli sourcemaps upload` exits non-zero, `\|\| true` swallows it, the deploy succeeds, `index.mjs.map` ships, and Node is not asked to read it. Sentry has no artifact and the runtime applies no map, so every prod stack trace is minified — the exact outcome the assertion rules out, with no signal anywhere. Probed, not assumed: `bash -c "false && echo DELETED || true"` prints nothing and exits 0 (the map survives, the deploy passes), and `grep -rl 'setSourceMapsEnabled\|enable-source-maps'` over `@sentry/node@11.6.0` and `@sentry/aws-serverless@11.6.0` `build/` returns nothing while the same grep for `captureException` returns files, so the SDK does not turn runtime source-map resolution on by itself | FAIL (blocking) |
| A07 | Assertions 3 | "Neither `sentry-cli` call may fail a deploy." | source-map-upload.utils.ts:25-26 | Both commands end in `\|\| true`; `A && B \|\| true` exits 0 whether the upload or the `rm` fails. CDK runs each hook command through `bash -c` (aws-cdk-lib `Bundling.executeBundlingSteps`), so the operator precedence is POSIX shell's | PASS |
| A08 | Assertions 4 | "Every interpolated value is shell-quoted, since a checkout path may hold a space." | source-map-upload.utils.ts:14-16, :22-23 | `` return `'${value.replaceAll("'", `'\\''`)}'`; `` applied to the output directory and to each of org, project and release; the only unquoted interpolations are the `SENTRY_CLI` constant and the already-quoted `target` | PASS |
| A09 | Assertions 1 | "An app that configures no upload builds and ships its map exactly as before." | lambda-api.ts:100, source-map-upload.utils.ts:48 | `...(upload === undefined ? {} : { commandHooks: buildSourceMapUploadHooks(upload) })` — with no target the returned object is the former literal, key for key | PASS |
| A10 | Assertions 5 | "No test performs a real upload." | apps/pragma/cdk/test/stack.test.ts:65-76 | `buildPragmaAppStack({ scope: stack, stage, …, ...(stage === 'prod' ? { errorReporting: PROD_ERROR_REPORTING } : {}) })` passes no `sourceMapUpload`, so the real synth in that file installs no `commandHooks`; the only test touching the commands compares strings | PASS |
| A11 | What this change does 1 (deploy path) | The uploader the hook names resolves where CDK runs it | measured here | `pnpm exec sentry-cli --version` → `sentry-cli 2.58.6`, exit 0. aws-cdk-lib `Bundling.getLocalBundlingProvider` sets `cwd = this.projectRoot` (the directory of `pnpm-lock.yaml`, the repository root) and `executeBundlingSteps` spawns each hook with `env: {...process.env, ...environment}`, so `SENTRY_AUTH_TOKEN` from the workflow reaches `sentry-cli` | PASS |
| A12 | How it will be judged | "The preview deploy this opens. Compare a cold start's `InitDuration` against the 1259 ms recorded" | apps/pragma/cdk/bin/cdk.ts:46-52, .github/workflows/preview.yml:157-169 | `if (organization === undefined \|\| project === undefined) return undefined;` reads `SENTRY_ORG` and `SENTRY_PROJECT`, which `preview.yml` documents as "variables of the prod environment, which this job does not name, so they read as empty here". If that comment is true the preview installs no hook, ships the map and changes no `NODE_OPTIONS` (preview never set one), so the preview's `InitDuration` cannot show the saving the spec asks the operator to read there. The GitHub variables API is blocked for this session (HTTP 403), so the premise is unchecked | UNVERIFIABLE |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | Names carry intent; no abbreviations or single-letter locals | read the 8 changed source files in full | `outputDirectory`, `sourceMapUpload`, `buildSourceMapUploadCommands`, `isScheduledStreakReminder`; no abbreviation, no single-letter local | PASS |
| B02 | Magic numbers / strings extracted | read in full | `const SENTRY_CLI = 'pnpm exec sentry-cli'` (source-map-upload.utils.ts:10), `FLUSH_TIMEOUT_MILLISECONDS` kept; the remaining literals are the CLI's own subcommand and flag syntax | PASS |
| B03 | No prose comments (`borso/no-comments`) | `git diff origin/main...HEAD -- '*.ts' \| grep -E '^\+' \| grep -E '//\|/\*'` | Only matches inside command strings (`\|\| true`); no comment added. The `--enable-source-maps` change also removed no explanatory comment | PASS |
| B04 | Standards 01: "a `build…`, `project…` or `select…` returns what its verb says" | read in full | `buildSourceMapUploadCommands` returns `readonly string[]` of commands, `buildSourceMapUploadHooks` returns `ICommandHooks`, `buildHandlerBundling` returns `BundlingOptions`; `readSourceMapUpload` follows the file's existing `readOptionalSetting` | PASS |
| B05 | Standards 01: a boolean name is not negated | read in full | No boolean added; `isScheduledStreakReminder` (pre-existing) is affirmative | PASS |
| B06 | Standards 01: a file name says what the file holds | read in full | `source-map-upload.utils.ts` sits beside `naming.utils.ts`, `stage-wiring.utils.ts`, `oidc-subject.utils.ts` in `infra/cdk/src/internal/`, is pure, and is named for its subject | PASS |
| B07 | Standards 02: the choice between `.core.ts` and `.utils.ts` | read in full | `infra/cdk` has no domain language a band or a race would recognise; every pure module there is `.utils.ts`. `.utils.ts` is right | PASS |
| B08 | Standards 12: a disable comment's reason is checkable | grep on added lines | No `eslint-disable` added. The one in `error-reporting.adapter.ts:87` is pre-existing and untouched | PASS |
| B09 | Type assertions limited to `as const` / `as unknown` | `grep -nE ' as [A-Za-z]' <changed files>` | Only `{ app: 'pragma' } as const` (pre-existing) and `['prod','preview'] as const` in tests | PASS |
| B10 | No `any` | `grep -nP '\bany\b' <changed files>` | Two hits, both `expect.any(Function)` in a test | PASS |
| B11 | `noUncheckedIndexedAccess` honoured | grep on added lines for `[…]` access | No index access added; the new test reads with `.at(1) ?? ''` and `.at(0)?.` | PASS |
| B12 | `useEffect` is a smell | `grep -nE '\buseEffect\(' <changed .ts/.tsx>` | none found (no front-end file in the diff) | PASS |
| B13 | Lint clean | `pnpm exec oxlint --type-aware <11 changed .ts files>` | exit 0, no warning (`denyWarnings` on) | PASS |
| B14 | Typecheck | `pnpm --filter @borso/infra run typecheck`, `pnpm --filter @borso-app/pragma run typecheck` | exit 0 and exit 0 | PASS |
| B15 | Dependency bookkeeping (`knip`) | `pnpm knip` | exit 0; `@sentry/cli` added to the root `ignoreDependencies` because only a shell string names it. `pnpm-workspace.yaml` pins it through the catalog at the `2.58.6` the lockfile already carried | PASS |
| B16 | Standards 10: a test name states the behaviour and the condition | read the two changed test files in full | `it('keeps the map when the upload fails, so a deploy never loses it everywhere at once')`, `it('quotes a directory holding a space, which a checkout path may')`, `it('asks Node to read no source map, at either stage, since none ships')` | PASS |
| B17 | Blueprint `app-cdk-stack`, whose source is this file: "hands them to `PreviewableApp` through conditional spreads so an absent prop is never passed as an explicit `undefined`" | read apps/pragma/cdk/lib/stack.ts in full against `.claude/skills/blueprint/blueprint-index.md:77` | `sourceMapUpload: props.sourceMapUpload,` at apps/pragma/cdk/lib/stack.ts:221, where every sibling optional uses `...(x === undefined ? {} : { x })` (lines 211-213, 228-230). The file is the blueprint's own exemplar with 3 followers, so the description it carries at line 177 is now false of line 221. Introduced: this branch. Fix size: one line | FAIL (non-blocking) |
| B18 | Names carry intent (CLAUDE.md "Clean code") | read in full | `function quote(value: string): string` at infra/cdk/src/internal/source-map-upload.utils.ts:14 does POSIX single-quote escaping for a shell word; the name says neither shell nor escaping, and the module's other names are fully explicit. `quoteForShell` would say it. Introduced: this branch. Fix size: one file, 4 call sites | FAIL (non-blocking) |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso/infra | `pnpm --filter @borso/infra exec vitest run --changed origin/main --reporter=verbose --coverage` | 0 — 35 files, 629 tests, coverage 100% statements / branches / functions / lines (per-file thresholds at 100), including the new `src/internal/source-map-upload.utils.test.ts` | PASS |
| C02 | @borso-app/pragma (core) | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed origin/main --reporter=verbose --coverage` | 0 — 4 files, 55 tests, coverage 100%. Files run: `api/src/helpers/observability/error-reporting.adapter.test.ts`, `cdk/test/stack.test.ts`, `api/src/mcp/tool-coverage.test.ts`, `api/src/realtime/stale-scope-coverage.test.ts` | PASS |
| C03 | @borso-app/pragma (back e2e) | `pnpm --filter @borso-app/pragma run test:e2e --changed origin/main` | 0 — 49 files, 449 tests, local Postgres booted | PASS |
| C04 | both (gated files) | `scripts/mutate-changed.sh origin/main` | 0 — 2 runs. `error-reporting.adapter.ts` 100% (break threshold 100) and `source-map-upload.utils.ts` 29/29 killed, 0 survived | PASS |
| C05 | both | Every `*.utils.ts` has a sibling `*.utils.test.ts` | 73 `*.utils.ts` files under `infra/cdk/src` and `apps/pragma`; 0 missing a sibling test. `infra/cdk` gates `src/**/*.ts` at 100% per file, so the new module is gated | PASS |
| C06 | repository gates touched by the diff | `scripts/check-adr-criteria.sh`, `scripts/check-adr-numbers-resolve.sh`, `scripts/check-named-paths-exist.sh`, `scripts/check-dated-records-are-append-only.sh`, `scripts/check-coupled-lists.sh` | 0 each; the new ADR resolves in filename, heading and index, and `proposed` is the correct status before merge (`.claude/skills/adr/SKILL.md:170`) | PASS |

## D. Test coverage of spec

Rows are the spec's *Assertions*, in order, split where a bullet makes two claims.

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | "An app that configures no upload builds and ships its map exactly as before" | `it('builds a map and no upload hook when no target is given')` at infra/cdk/src/internal/source-map-upload.utils.test.ts:75; asserts `expect(buildHandlerBundling(undefined)).toEqual({ minify: true, sourceMap: true, target: 'node22', format: OutputFormat.ESM, mainFields: ['module','main'], banner: BANNER })` at :76-83, and `expect(rest).toEqual(buildHandlerBundling(undefined))` at :97 pins that a configured app changes nothing else | PASS |
| D02 | "The map is deleted only when the upload succeeded" | `it('keeps the map when the upload fails, so a deploy never loses it everywhere at once')` at :22; asserts `expect(upload.indexOf('&& rm -f')).toBeGreaterThan(upload.indexOf('sourcemaps upload'))` at :24 | PASS |
| D03 | "A bad token or a network blip degrades to today's behaviour rather than leaving the map nowhere" | (none found) — no test asserts that a failed upload still leaves readable frames, and the implementation does not (see A06). The claim's own test would be `readApiVariables('prod')` containing `NODE_OPTIONS`, and apps/pragma/cdk/test/stack.test.ts:430-434 now asserts the opposite | FAIL (blocking) |
| D04 | "Neither `sentry-cli` call may fail a deploy" | `it('lets a failed inject pass, because it is not worth a failed deploy')` at :28, asserting `.at(0)?.endsWith('\|\| true')` at :29; and `expect(upload.endsWith('\|\| true')).toBe(true)` at :25 | PASS |
| D05 | "Every interpolated value is shell-quoted, since a checkout path may hold a space" | `it('quotes a directory holding a space, which a checkout path may')` at :32, exact-matching both commands against `'/two words'` at :33-36; `it('escapes a quote inside a value rather than ending the quoted word')` at :39 asserting ``toContain(`--org 'it'\\''s'`)`` at :44; `it('carries each upload field into the upload call')` at :47 pins org, project and release | PASS |
| D06 | "No test performs a real upload" | structural: the only construct test that bundles for real, apps/pragma/cdk/test/stack.test.ts:65-76, passes no `sourceMapUpload`, so `buildHandlerBundling` installs no `commandHooks`; `grep -rn sourceMapUpload --include=*.ts apps infra` finds no test setting it | PASS |
| D07 | "The commands and the bundling options are asserted exactly, by a pure test" | `it('injects debug ids, then uploads and deletes the map only if the upload worked')` at :15 with a full `toEqual` on both command strings at :16-19, and the `toEqual` on the whole bundling object at :76-83. The file imports only the module under test | PASS |
| D08 | "One invocation performs one flush" | (none found) — nothing imports `apps/pragma/api/src/main.ts`; `grep -rn "api/src/main\|from '.*/main'" --include=*.test.ts apps/pragma` returns nothing, no app has a `main*.test.ts`, and `apps/pragma/vitest.config.ts` lists no project include that would pick one up. The branch also deleted the only assertion that a flush ever happens on a request path (`expect(sentry.flush).toHaveBeenCalledWith(2_000)` → `not.toHaveBeenCalled()` at error-reporting.adapter.test.ts:177). Failing case: delete `await flushErrorReports();` at main.ts:46 and the whole suite stays green, while prod drops every buffered event because the Lambda freezes before the transport sends | FAIL (blocking) |
| D09 | "`traceIncomingRequest` performs none" | `it('answers inside a server span continuing the caller trace, and leaves the flush to the invocation')` at apps/pragma/api/src/helpers/observability/error-reporting.adapter.test.ts:154; asserts `expect(sentry.flush).not.toHaveBeenCalled()` at :177 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Does the diff write to a database? | `git diff origin/main...HEAD --name-only -- '*.service.ts' '*.repository.ts' '*.controller.ts' '*.queries.ts'` lists no file, and no added line matches `\b(insert\|update\|delete\|onConflict\|transaction)\(`. No check-then-write exists to race | PASS |
| E02 | per-process state | Does the diff add state a Lambda instance holds? | `git diff … \| grep -E '^\+(let \|const [a-zA-Z]+ = new (Map\|Set))'` returns nothing. The flush moves from middleware to the handler's `finally` (main.ts:45-47), which runs once per invocation and before the response returns, so a frozen container never carries an unflushed buffer. The scheduled branch returns at main.ts:41 after `runScheduledStreakReminder`'s own `finally` flush (:28-30), so neither path double-flushes | PASS |
| E03 | build-time shared resource | Two bundles writing the same output directory at once? | The hook's only write is `rm -f <outputDirectory>/*.map`, where `outputDirectory` is the per-asset staging directory CDK passes to `afterBundling`; `const sourceMapUpload` (cdk.ts:55) is read once per synth process. Nothing is shared between two deploys | PASS |

## Blocking findings

- A06 / D03 — `NODE_OPTIONS=--enable-source-maps` is removed unconditionally (apps/pragma/cdk/lib/stack.ts:104-112), while the map is deleted only on a successful upload. A failed upload (revoked token, Sentry outage, rate limit, or a Docker-bundling fallback where `pnpm exec` does not exist) is swallowed by `|| true`, so prod ships a map nothing reads and Sentry holds none: minified frames everywhere, silently. Both halves were probed, in A06's evidence cell: the shell keeps the map and exits 0, and neither Sentry package enables runtime source maps on its own. The spec's assertion 2 and the ADR's decision paragraph both promise the opposite. Either keep the flag (it costs the measured 20 ms once the map is gone, not the 91 ms the map costs), or make the degraded state visible, and pin the choice with a `readApiVariables('prod')` assertion.
- D08 — No test covers "one invocation performs one flush". Nothing imports `apps/pragma/api/src/main.ts`, and the branch removed the suite's only assertion that a flush happens at all on a request path. Deleting `await flushErrorReports();` at main.ts:46 leaves every test green and drops every production error report. A pure test over the handler with the adapter mocked, added to `PURE_TEST_FILES` in `apps/pragma/vitest.config.ts` the way `tool-coverage.test.ts` already is, would pin both halves of the assertion.

## Non-blocking findings

- B17 — `sourceMapUpload: props.sourceMapUpload` at apps/pragma/cdk/lib/stack.ts:221 passes an explicit `undefined`, against the conditional-spread rule stated in the blueprint description that this very file carries (line 177) and that its three followers copy.
- B18 — `quote` at infra/cdk/src/internal/source-map-upload.utils.ts:14 does POSIX shell escaping; the name says neither shell nor escaping.

## Notes

> *One bullet per UNVERIFIABLE row, plus any concern that has no failing case yet, phrased as a question.*

- A12 (UNVERIFIABLE). `readSourceMapUpload()` returns `undefined` unless `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` and `GITHUB_SHA` are all non-empty. `.github/workflows/preview.yml:157-162` states that the org and the project are prod-environment variables the preview job does not name, so they read as empty there. If that is true, the preview this PR deploys installs no hook, still ships the map, and never set `NODE_OPTIONS` to begin with, so its `InitDuration` is the same bundle as today's and cannot show the saving the spec names as the judgement. The GitHub variables and environments APIs are both blocked for this session (HTTP 403), so the premise could not be confirmed. Does the operator want the two variables exposed to the preview job, or is the judgement moving to the prod deploy?
- The plan is absent by design (Tier 1 chain). No row above needed it; ADR-202611111658 carries the decision, its criteria and the rejected options, and `scripts/check-adr-criteria.sh` passes on it.
- `sentry-cli sourcemaps inject` rewrites `index.mjs` after esbuild and before CDK hashes the asset. That is the behaviour aws-cdk-lib documents for `afterBundling` under `AssetHashType.OUTPUT`, and it was not exercised here: should the PR body say the first pragma deploy on this branch is the first time any of these commands runs for real?

## Verdict: FAIL
