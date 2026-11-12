# Technical validation — Every app traces to Sentry as pragma does (round 2, kaizen sweep of PR #295 plus the esbuild-plugin bundling)

- Spec: [`../spec/spec.md`](../spec/spec.md), and for the new scope ADR-2026-11-12T0008 ([`api-lambdas-bundle-with-sentrys-esbuild-plugin`](../../../../adr/2026-11-12T0008-api-lambdas-bundle-with-sentrys-esbuild-plugin.md))
- Plan: none (`../plan/plan.md` absent). The ADR stands in for the new scope.
- Branch: claude/lessons-from-pr-295
- Base: origin/main
- Run at: 2026-11-12T00:21:24Z
- Round: 2
- Reviewed: 2d5b44a3c841713cd1c08a1e6b4c595a5e57fc67
- Touched workspaces: @borso/infra (infra/cdk), @borso-app/pragma, @borso-app/last-loop-lepin, @borso-app/banana-rush, @borso-app/talos (api error-reporting adapters), repository config (`knip.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.github/workflows/preview.yml`)

Round 2 reads `git diff 59b8838f5..2d5b44a3c`. Round 1 had no blocking finding. Its two non-blocking findings are dismissed or fixed in commit f4060c98c, so each gets a row under *Round-1 findings*. The fix commits also carry new scope: the bundling change of ADR-2026-11-12T0008 (infra/cdk and the four API adapters). Round 1 never read those files, so categories A, B and D walk each of them in full, as round 1 would. Spec: ADR-2026-11-12T0008 for that scope. Categories A and D take one row per *Decision* sentence and per *Consequences* bullet that names something the code does, plus spec use case 7, which the ADR implements. Nothing is routed to `/visual-validation`.

Probes named below were run in `/tmp/claude-0/c72ce888-8956-58c0-8980-36e03d8aabc2/scratchpad/technical-validator/probe/`. Each one bundles with the branch's own `infra/cdk/src/internal/handler-bundler.mjs`, runs `@sentry/aws-serverless` 11.6.0 with an in-memory transport, and uses the local Postgres from `scripts/local-postgres.sh`.

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A00 | plan | A plan exists to check the file list against | `docs/features/meta/sentry-tracing-all-apps/plan/plan.md` | File absent. The ADR's *Implementation pointers* list the files, and every row below takes its files from the diff | UNVERIFIABLE |
| A01 | ADR Decision | `LambdaApi` builds a `lambda.Function` whose code is a local-bundling asset | infra/cdk/src/constructs/lambda-api.ts:74-82, :130-133 | `return Code.fromAsset(path.dirname(absoluteEntry), { assetHashType: AssetHashType.OUTPUT, bundling: { image: HANDLER_RUNTIME.bundlingImage, local: new OrchestrionHandlerBundling(absoluteEntry, sourceMapUpload) } });` / `this.handler = new LambdaFunction(this, 'Fn', { … code: bundleHandlerCode(props.entry, props.sourceMapUpload), handler: BUNDLED_HANDLER,` | PASS |
| A02 | ADR Decision | A child Node process calls esbuild's `build` with the options `NodejsFunction` used before | infra/cdk/src/internal/handler-bundle.utils.ts:28-43, lambda-api.ts:64 | `minify: true, sourcemap: true, mainFields: ['module', 'main'], banner: { js: NODE_BUILTIN_REQUIRE_SHIM_BANNER }, external: PACKAGES_THE_NODE_22_RUNTIME_PROVIDES` with `target: 'node22', format: 'esm'`. These match the removed `buildHandlerBundling` (`minify`, `sourceMap`, `target: 'node22'`, `OutputFormat.ESM`, `mainFields`, `banner`) plus NodejsFunction's own defaults for Node 22 (`@aws-sdk/*` external, `index.mjs`, `logLevel: 'warning'`). Called as `execFileSync(process.execPath, buildHandlerBundlerArguments(HANDLER_BUNDLER_SCRIPT, request), …)` | PASS |
| A03 | ADR Decision | `sentryOrchestrionPlugin` is added to that build | infra/cdk/src/internal/handler-bundler.mjs:1, :6 | `import { sentryOrchestrionPlugin } from '@sentry/server-utils/orchestrion/esbuild';` / `await build({ ...JSON.parse(serializedBuildOptions), plugins: [sentryOrchestrionPlugin()] });`. Measured: bundling each app's real `api/src/main.ts` with these options puts `orchestrion:postgres:handle`, `:execute`, `:connect` and `:connection` into all four bundles | PASS |
| A04 | ADR Decision | Then the existing `sentry-cli` source-map upload runs | lambda-api.ts:67-69, handler-bundle.utils.ts:45-48 | `for (const command of buildAfterBundlingCommands(request)) { execSync(command, { stdio: ['ignore', process.stderr, 'inherit'] }); }`. The working directory moved from NodejsFunction's project root (the repo root) to the synth's own directory. Measured: `pnpm exec sentry-cli --version` from `apps/pragma`, where `deploy` runs, prints `sentry-cli 2.58.6` | PASS |
| A05 | ADR Decision | pragma, last-loop-lepin and banana-rush list `postgresJsIntegration()` | apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts:52, apps/last-loop-lepin/…/error-reporting.adapter.ts:53, apps/banana-rush/…/error-reporting.adapter.ts:52 | `Sentry.postgresJsIntegration(),` / `integrations: [Sentry.postgresJsIntegration()],` (twice) | PASS |
| A06 | ADR Decision, UC7 | talos lists no database integration, so its agent SQL reaches no span | apps/talos/api/src/helpers/observability/error-reporting.adapter.ts:18 | `const UNTRACED_INTEGRATION_NAMES: ReadonlySet<string> = new Set(['NodeFetch']);`. Measured with a talos-shaped probe (`probe-talos.ts`: the SDK defaults minus `NodeFetch`, bundled with the plugin, so the driver is rewritten): a `select iban from secret_members where email = $1` inside a request span sends no table name and no value | PASS |
| A07 | ADR Decision | last-loop-lepin, banana-rush and talos set `enableRuntimeChannelInjection: false` | last-loop-lepin adapter.ts:52, banana-rush adapter.ts:51, talos adapter.ts:80 | `enableRuntimeChannelInjection: false,` in each. pragma's comes with PR #298, as the ADR says | PASS |
| A08 | ADR Consequence 1, spec UC7 | "A request's trace shows its database time, with the statement kind as the span name and no table or value (`databaseQueryData: false`)". Spec UC7: "No SQL text and no request body reaches a span" | pragma adapter.ts:16-24 with :50-53, and the same `PRIVATE_DATA_COLLECTION` plus `postgresJsIntegration()` in last-loop-lepin and banana-rush | Failing case, measured (`probe2.ts`, the apps' exact `dataCollection` with `databaseQueryData: false`, `enableRuntimeChannelInjection: false` and `integrations: [Sentry.postgresJsIntegration()]`, bundled by `handler-bundler.mjs`). Inside a request span, ``sql`select iban from secret_members where email = ${'alice@example.com'}` `` sends a `db` span named `"select secret_members"` with the attribute `db.query.text: "select iban from secret_members where email = $1"`. The driver's own type query goes out as `db.query.text: "select b.oid, b.typarray from pg_catalog.pg_type a left join …"`. The value `alice@example.com` is absent. So the table and column names and the full SQL text reach Sentry from pragma, last-loop-lepin and banana-rush, where the ADR promises the statement kind only and the spec promises no SQL text. Only a table-less `select 1` gets the bare name `select`, which is what the ADR's probe used. `docs/knowledge/sentry-11-tracing-is-not-what-sentry-8-tracing-was.md:67-68` repeats the same wrong claim. Introduced: this branch | FAIL (blocking) |
| A09 | ADR Consequence 2 | The startup warning "Failed to register diagnostics-channel injection hooks" stops in the three apps | A07's lines | Measured: the D01 probe below, with the default (on) injection, prints `[Sentry] Failed to register diagnostics-channel injection hooks…`. The refusal probe with `enableRuntimeChannelInjection: false` prints nothing | PASS |
| A10 | ADR Consequence 3 | pragma's API bundle grows to 2,049,353 bytes | handler-bundle.utils.ts options + handler-bundler.mjs | Measured: `bundle-pragma/index.mjs` is 2,049,353 bytes | PASS |
| A11 | ADR Consequence 4 | `infra/cdk` depends on `esbuild` and `@sentry/server-utils` at synth time | infra/cdk/package.json:31-33, pnpm-workspace.yaml:19 | `"@sentry/server-utils": "catalog:", "esbuild": "catalog:",` moved into `dependencies`. The lockfile importer for infra/cdk records both. `knip.json` drops `ignoreDependencies: ["esbuild"]` and adds `handler-bundler.mjs` as an entry. The build copies `handler-bundler.mjs` to `dist/internal/`, where `HANDLER_BUNDLER_SCRIPT` (lambda-api.ts:51) resolves it from `dist/constructs/` | PASS |
| A12 | ADR Consequence 5 | The plugin warns that `@aws-sdk/smithy-client` is external | — | Measured on all four bundles: `▲ [WARNING] The following packages are marked as external … @aws-sdk/smithy-client` | PASS |

## Round-1 findings (round 2 only)

| # | Round-1 row | Fixed by | Verdict |
|---|---|---|---|
| R01 | B10 (non-blocking): the preview.yml comment was a history note and restated the job-env comment | f4060c98c, .github/workflows/preview.yml:418-420 | The comment now reads `# The comment is where a reader checks a preview, so it says when` / `# Sentry is off. See` / `# docs/dantotsus/the-preview-that-could-not-prove-tracing.md.`. No history note and no restatement remain | PASS |
| R02 | D01 (non-blocking), dismissed in f4060c98c: "no test can tell createApp's onError from Hono's default, because both answer the same 500 and Sentry is not started in tests. The one observable difference is the call into the Sentry adapter, which only a module mock could see" | f4060c98c (dismissal, no code) | The claim does not hold, measured. Probe `d01.ts` imports the real `createApp` from apps/last-loop-lepin/api/src/app.ts, starts a real Sentry client with an in-memory `transport`, adds a throwing route and requests it. Bundled without the plugin, as Vitest loads it, it captures 1 exception event. Probe `d01b.ts` does the same against a bare Hono app with the default error handler and captures 0. No module mock is involved. So a back-e2e test can pin `.onError(answerUnhandledError)` at apps/last-loop-lepin/api/src/app.ts:24, and deleting that line still fails no test. The Sentry client must be started with `enableRuntimeChannelInjection: false`: with the plugin bundle (`out-d01b` plugin build) Sentry's own Hono integration also captures the default handler's error. Typed blocking because the round-2 rule grades a dismissal whose claim fails as blocking. Nothing in prod breaks, since `reportUnhandledError` is wired today | FAIL (blocking) |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations or one-letter locals | read every changed source and test file in full | `serializedBuildOptions`, `absoluteEntry`, `outputDirectory`, `PACKAGES_THE_NODE_22_RUNTIME_PROVIDES`, `shellCommands`. None found | PASS |
| B02 | Magic numbers and strings extracted | read in full | `BUNDLED_FILE_NAME`, `BUNDLED_HANDLER`, `NODE_BUILTIN_REQUIRE_SHIM_BANNER`, `HANDLER_RUNTIME`, `HANDLER_BUNDLER_SCRIPT`, `ORCHESTRION_POSTGRES_CHANNEL` are named. `'node22'`, `'esm'`, `'warning'` are esbuild option values in the one function that states them | PASS |
| B03 | No prose comments (`borso/no-comments`) | `grep -n '//'` on changed files | only `// @FollowsBlueprint` tags and pre-existing `eslint-disable-next-line typescript/no-deprecated -- …` reasons | PASS |
| B04 | Type assertions only `as const` and `as unknown` | `grep -nE ' as '` on changed files | only the import rename `Function as LambdaFunction` at lambda-api.ts:18 | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` | only `expect.any(Function)` in pre-existing test lines | PASS |
| B06 | `noUncheckedIndexedAccess` honoured | read in full | `const [assetDirectory] = …` falls back with `assetDirectory ?? ''` (lambda-api.test.ts:126-131). `serializedOptions ?? ''` in handler-bundle.utils.test.ts:51. `process.argv.at(2)` in the `.mjs` is untyped JavaScript | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware` on the 16 changed `.ts` and `.mjs` files | exit 0 | PASS |
| B08 | knip clean | `pnpm exec knip` | exit 0, configuration hints only | PASS |
| B09 | Typecheck | `pnpm --filter @borso/infra exec tsc --noEmit` | exit 0 | PASS |
| B10 | `useEffect` is a smell | `grep -nE '\buseEffect\('` | no changed `.tsx`. None | PASS |
| B11 | Standards checklist: `build…` returns a new value assembled from parts (01-naming verb table) | read handler-bundle.utils.ts in full | `buildHandlerBuildOptions`, `buildHandlerBundlerArguments` and `buildAfterBundlingCommands` each return a fresh value and write nothing | PASS |
| B12 | Standards checklist: a file name says what it holds (01-naming) | read the new files | `handler-bundle.utils.ts` holds the pure option builders. `handler-bundler.mjs` is the script that bundles. `fixtures/postgres-handler.ts` is a handler importing `postgres` | PASS |
| B13 | Standards checklist: the choice between `.core.ts` and `.utils.ts` (02-purity) | read in full | infra/cdk has no domain, and the options are a cross-cutting helper, so `.utils.ts` is right. Marked `// @FollowsBlueprint utils-pure-module` at handler-bundle.utils.ts:27 | PASS |
| B14 | Standards checklist: untrusted input is parsed with Zod (03-typing) | read handler-bundler.mjs | `JSON.parse(serializedBuildOptions)` reads an argument `lambda-api.ts` wrote one call earlier. It is not untrusted input | PASS |
| B15 | Standards checklist: a test name states the behaviour and the condition (10-testing) | read the changed tests | `'uploads the map from the bundle directory once the bundle is written'`, `'installs no database integration over the SDK defaults, so no span carries SQL text'`, `'builds the same bundle whether or not its map is uploaded'` | PASS |
| B16 | Standards checklist: a comment documents what the code cannot say (01-naming) | read preview.yml:418-420 | see R01 | PASS |
| B17 | `refactor:` commit names the dropped property (CLAUDE.md hard rules) | `git log 59b8838f5..HEAD --format=%B` | 45316ad6a: "it would have removed a Postgres integration a future SDK added to the defaults". 325203ff9 (a `feat:` that replaces a mechanism) also names "NodejsFunction's own bundling, which CDK upgrades improved without a change here" | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso/infra | `pnpm --filter @borso/infra exec vitest run --coverage --reporter=verbose` | 0. 36 files, 637 tests. Statements 996/996, branches 433/433, functions 222/222, lines 924/924. The three `LambdaApi handler bundle` tests pass | PASS |
| C02 | @borso-app/pragma core | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed 59b8838f5 --coverage --reporter=verbose` | 0. 8 files, 67 tests, coverage 100% | PASS |
| C03 | @borso-app/last-loop-lepin core | same, `@borso-app/last-loop-lepin` | 0. 2 files, 18 tests, coverage 100% | PASS |
| C04 | @borso-app/banana-rush core | same, `@borso-app/banana-rush` | 0. 2 files, 20 tests, coverage 100% | PASS |
| C05 | @borso-app/talos core | same, `@borso-app/talos` | 0. 5 files, 35 tests, coverage 100%. Both `selectTracedIntegrations` tests pass | PASS |
| C06 | the four apps, back-e2e | `pnpm --filter <app> run test:e2e --changed 59b8838f5` | 0 each. pragma 50 files, last-loop-lepin 13, banana-rush 5, talos 20 | PASS |
| C07 | gated files | `scripts/mutate-changed.sh 59b8838f5 infra/cdk apps/pragma/api apps/last-loop-lepin/api apps/banana-rush/api apps/talos/api` | 0. Four `error-reporting.adapter.ts` (43, 41, 48, 48 mutants), `handler-bundle.utils.ts` (20) and `source-map-upload.utils.ts` (9): 100%, none survived | PASS |
| C08 | `*.utils.ts` have their tests | list changed `*.utils.ts` | `handler-bundle.utils.ts` has `handler-bundle.utils.test.ts`, `source-map-upload.utils.ts` keeps `source-map-upload.utils.test.ts`. Both run in C01 | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | ADR Decision: the handler is a `lambda.Function` built from a local bundle, one ESM file and its map | `it('ships one ESM file and its map, and uploads nothing without a target'` at infra/cdk/test/unit/lambda-api.test.ts:158, `expect(synthBundle().files).toEqual(['index.mjs', 'index.mjs.map']);`. Handler pinned by `Handler: 'index.handler',` at :79 | PASS |
| D02 | ADR Decision: the build keeps NodejsFunction's options | `it('bundles one minified ESM file for Node 22 with its map, leaving the SDK the runtime provides'` at handler-bundle.utils.test.ts:16, `expect(buildHandlerBuildOptions(REQUEST)).toEqual({ … external: ['@aws-sdk/*'], … })`. The arguments reach the script as one JSON value (`expect(JSON.parse(serializedOptions ?? '')).toEqual(buildHandlerBuildOptions(REQUEST));` at :51) | PASS |
| D03 | ADR Decision: Sentry's plugin rewrites the inlined `postgres` driver | `it('rewrites the postgres driver to publish the channels Sentry turns into database spans'` at lambda-api.test.ts:154, `expect(synthBundle({ entry: POSTGRES_ENTRY }).code).toContain(ORCHESTRION_POSTGRES_CHANNEL);` | PASS |
| D04 | ADR Decision: the source-map upload runs after the bundle | `it('uploads the map from the bundle directory once the bundle is written'` at lambda-api.test.ts:163, `expect(shellCommands.at(1)).toContain("--org 'borsofr' --project 'pragma' --release 'abc123'");`, and `expect(shellCommands).toEqual([]);` without a target at :160 | PASS |
| D05 | ADR Decision: three apps list `postgresJsIntegration()` | `integrations: [{ name: 'PostgresJs' }],` in the `toHaveBeenCalledWith` of last-loop-lepin adapter.test.ts:68 and banana-rush adapter.test.ts:75, and `{ name: 'PostgresJs' },` at pragma adapter.test.ts:75. C07 kills every mutant of those lines | PASS |
| D06 | ADR Decision, UC7: talos lists no database integration | `it('installs no database integration over the SDK defaults, so no span carries SQL text'` at talos adapter.test.ts:93, `expect(names).not.toContain('PostgresJs');` at :102, over the SDK's real `getDefaultIntegrations({})` | PASS |
| D07 | ADR Decision: three apps turn the runtime hook off | `enableRuntimeChannelInjection: false,` asserted at last-loop-lepin adapter.test.ts:67, banana-rush :74, talos :79 | PASS |
| D08 | ADR Consequence 1, UC7: a database span carries the statement kind only, no table, no value, no SQL text | none found. The adapter tests assert only that `databaseQueryData: false` is passed. No test bundles a query and reads the span Sentry would send. The probe in A08 shows the claim is false, so a test of it would fail today | FAIL (blocking) |
| D09 | ADR Consequence 3: bundle size | structural: a measurement, not a behaviour. Measured in A10 | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Does the diff write to a database or keep state | `git diff 59b8838f5..HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` is empty. The module-level values the diff adds are constants (`HANDLER_RUNTIME`, `HERE`, `HANDLER_BUNDLER_SCRIPT` in lambda-api.ts:49-51, the options constants in handler-bundle.utils.ts:19-25). `vi.hoisted` `shellCommands` is test state reset in `afterEach` | PASS |

## Blocking findings

- A08 — with `databaseQueryData: false`, pragma, last-loop-lepin and banana-rush send each query's table names in the span name and its SQL text in `db.query.text` (measured: `"select secret_members"` and `"select iban from secret_members where email = $1"`). This breaks spec use case 7 and the ADR's own consequence. The knowledge entry at `docs/knowledge/sentry-11-tracing-is-not-what-sentry-8-tracing-was.md:67-68` states the same wrong claim.
- D08 — no test pins what a database span carries, so A08 shipped green.
- R02 — the D01 dismissal says only a module mock could observe the report. A real Sentry client with an in-memory transport observes it: 1 event through `createApp`, 0 through Hono's default handler.

## Non-blocking findings

- none

## Notes

- A00: the plan is absent. The branch is a kaizen sweep, and the ADR's pointers stand in. Copy this row into the pull request description if the branch reaches PASS_EXCEPT_UNVERIFIABLE.
- A08 options, for the implementer to weigh. A `beforeSendSpan` hook could drop `db.query.text` and rename `db` spans to their `db.operation.name`, or `ignoreSpans` could drop them. Whether the integration exposes an option for this in 11.6.0 was not checked. Either way, the test D08 asks for is a probe like `probe2.ts`: bundle a query with `handler-bundler.mjs`, read the envelope, and assert no table name and no SQL text.
- pragma's `WebSocketChannel` (infra/cdk/src/constructs/web-socket-channel.ts) still builds with `NodejsFunction`, so its queries get no database span. The ADR scopes itself to API Lambdas. Is that the intended boundary?
- Bundling with the same options but `minify: false` gives a bundle Node refuses: `SyntaxError: Identifier 'createRequire' has already been declared`, because Sentry's Hono integration imports `createRequire` from `node:module` next to the banner's own. The shipped options minify, which renames the import, and all four real bundles pass `node --check`. Should the banner use a name nothing else imports, so the bundle does not depend on minification to load?
- Asset staging: `Code.fromAsset(path.dirname(absoluteEntry), …)` gives `apps/<app>/api/src` as the asset source, while the old NodejsFunction used the project root. With `AssetHashType.OUTPUT` the source directory is not hashed. Does staging copy it into `cdk.out` on every synth? No failing case was found.

## Verdict: FAIL
