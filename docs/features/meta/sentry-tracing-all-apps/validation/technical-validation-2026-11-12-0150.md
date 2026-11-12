# Technical validation — API Lambdas drop Sentry's Hono middleware spans

- Spec: ADR-2026-11-12T0008, section *Revision 2026-11-12 — the plugin also instruments Hono* ([`docs/adr/2026-11-12T0008-api-lambdas-bundle-with-sentrys-esbuild-plugin.md`](../../../../adr/2026-11-12T0008-api-lambdas-bundle-with-sentrys-esbuild-plugin.md))
- Plan: none
- Branch: claude/sentry-drop-middleware-spans
- Base: origin/main
- Run at: 2026-11-12T01:46:00Z
- Round: 1
- Reviewed: d147cfcc4ed11fb95c444b5af9934b0d80099c20
- Touched workspaces: @borso-app/pragma, @borso-app/last-loop-lepin, @borso-app/banana-rush, @borso-app/talos

The ADR stands in for the spec. Categories A and D take one row per Revision sentence that names something the code does. 0 use cases routed to `/visual-validation`, because the change has no screen.

Probe run by this validator: an entry with a Hono app, one `app.use` middleware and a route that opens a `db` span, inside a manual `http.server` span. It was bundled with Sentry's plugin through `scratchpad/db-spans/build.mjs` (`ENTRY=… node build.mjs … plugin`), run with and without `ignoreSpans: [{ op: 'middleware' }]`, and then deleted from `apps/last-loop-lepin/`. Envelopes captured by a fake transport (measured):

```
without ignoreSpans:
span op=db          origin=manual               name=select      parent=a57b3e1c2c9f9741
span op=middleware  origin=auto.middleware.hono name=<anonymous> parent=a57b3e1c2c9f9741
span op=http.server origin=manual               name=GET /probe  parent=undefined
with ignoreSpans:
span op=db          origin=manual               name=select      parent=a76d34d777206c90
span op=http.server origin=manual               name=GET /probe  parent=undefined
```

## A. Correctness vs spec

| # | Spec ref | Claim | Code (file:line) | Evidence (quoted) | Verdict |
|---|---|---|---|---|---|
| A01 | Revision, "Each API now passes `ignoreSpans: [{ op: 'middleware' }]`" | pragma passes it | apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts:27, :54 | `const UNREPORTED_SPANS: ReportingOptions['ignoreSpans'] = [{ op: 'middleware' }];` … `ignoreSpans: UNREPORTED_SPANS,` | PASS |
| A02 | same | last-loop-lepin passes it | apps/last-loop-lepin/api/src/helpers/observability/error-reporting.adapter.ts:27, :56 | `const UNREPORTED_SPANS: ReportingOptions['ignoreSpans'] = [{ op: 'middleware' }];` … `ignoreSpans: UNREPORTED_SPANS,` | PASS |
| A03 | same | banana-rush passes it | apps/banana-rush/api/src/helpers/observability/error-reporting.adapter.ts:26, :55 | `const UNREPORTED_SPANS: ReportingOptions['ignoreSpans'] = [{ op: 'middleware' }];` … `ignoreSpans: UNREPORTED_SPANS,` | PASS |
| A04 | same | talos passes it | apps/talos/api/src/helpers/observability/error-reporting.adapter.ts:40, :83 | `const UNREPORTED_SPANS: ReportingOptions['ignoreSpans'] = [{ op: 'middleware' }];` … `ignoreSpans: UNREPORTED_SPANS,` | PASS |
| A05 | Revision, "showed the middleware span gone" | The Hono middleware span carries op `middleware` and the pattern matches it | node_modules/.pnpm/@sentry+server-utils@11.6.0/…/integrations/hono/wrapMiddlewareSpan.js:20-26; @sentry/core@11.6.0 utils/should-ignore-span.js:25 | `[SENTRY_OP]: MIDDLEWARE, [SENTRY_ORIGIN]: MIDDLEWARE_ORIGIN` and `const opMatches = pattern.op ? span.op && isMatchingPattern(span.op, pattern.op) : true;`. The validator's probe above shows the `op=middleware origin=auto.middleware.hono` span gone with the option. | PASS |
| A06 | Revision, "and the request span kept" (and the goal: database spans kept) | `http.server` and `db` spans survive, and the `db` span keeps its parent | @sentry/core@11.6.0 utils/string.js:74; wrapMiddlewareSpan.js:20 | `return requireExactStringMatch ? value === pattern : value.includes(pattern);`. Neither `http.server` nor `db` contains `middleware`. The middleware span is opened with `startInactiveSpan`, so no database span is its child. Probe: `op=db … parent=a76d34d777206c90` is the `http.server` span in both runs. | PASS |
| A07 | Revision, "Its `instrumentations` option only adds to Sentry's list, so it cannot leave Hono out" | The plugin option cannot narrow the list | node_modules/.pnpm/@sentry+server-utils@11.6.0/…/orchestrion/config/index.js:93 | `...uniq([...SENTRY_INSTRUMENTATIONS, ...instrumentations].map((i) => i.module.name)),` | PASS |
| A08 | Revision, "Implication for the original decision: still valid" | The rest of each `Sentry.init` is untouched | diff of the four adapters | Each adapter hunk adds only the constant and the `ignoreSpans:` line. `enableRuntimeChannelInjection: false`, `integrations` and `beforeSendSpan: redactDatabaseSpan` are unchanged context lines. | PASS |
| A09 | Plan | A plan exists for the change | `plan_path: none` | No `plan/plan.md` for this change. The brief records the operator's approval of the one-line approach instead. | FAIL (non-blocking) |

## B. Code cleanliness

| # | Rule | Check | Evidence | Verdict |
|---|---|---|---|---|
| B01 | No abbreviations or one-letter locals | read the four adapter diffs | The only new name is `UNREPORTED_SPANS`. None found. | PASS |
| B02 | Magic strings in named constants | read | `'middleware'` lives in `UNREPORTED_SPANS` in each adapter (pragma :27, last-loop-lepin :27, banana-rush :26, talos :40) | PASS |
| B03 | No prose comments | `git diff` | No comment lines added | PASS |
| B04 | Type assertions only `as const` / `as unknown` | read | None added. The constant is typed by annotation `ReportingOptions['ignoreSpans']`, a type derived from `Sentry.init` (03-typing reviewer bullet holds). | PASS |
| B05 | No `any` | `grep -nP '\bany\b'` on the eight files | Only `expect.any(Function)` in test files (pre-existing, not the type) | PASS |
| B06 | `noUncheckedIndexedAccess` | read | No array access added | PASS |
| B07 | Lint clean | `pnpm exec oxlint --type-aware <8 changed .ts files>` | exit 0, no output | PASS |
| B08 | Typecheck | `pnpm --filter @borso-app/<app> run typecheck` for the four apps | exit 0 ×4 | PASS |
| B09 | `useEffect` | `grep -nE '\buseEffect\('` | none in the diff | PASS |
| B10 | Standards checklist (10-testing): "a test name states the behaviour and the condition" | read the four changed tests in full | Each startup test now also pins `ignoreSpans: [{ op: 'middleware' }]`, and none of the names says so: `it('starts the SDK with every personal data category off, no trace header sent outward and no SQL on a database span', …)` at apps/pragma/api/src/helpers/observability/error-reporting.adapter.test.ts:55; same at apps/last-loop-lepin/…/error-reporting.adapter.test.ts:49, apps/banana-rush/…/error-reporting.adapter.test.ts:50, apps/talos/…/error-reporting.adapter.test.ts:55. A reader of the test list cannot find which test holds the middleware rule. Introduced: this branch; Fix size: 4 lines | FAIL (non-blocking) |
| B11 | Standards checklist, remaining reviewer bullets (naming verbs, negated booleans, file names, `.core`/`.utils` choice, derived types, Zod parsing, repository shape, transactions, front-end bullets) | read the four adapters in full | No bullet applies to the added lines. The adapters keep `// @FollowsBlueprint adapter-external-service`. No `VOCABULARY.md` changed. | PASS |

## C. Tests pass

| # | Workspace | Command | Exit | Verdict |
|---|---|---|---|---|
| C01 | @borso-app/pragma | `pnpm --filter @borso-app/pragma exec vitest run --project core --changed $(git rev-parse origin/main) --coverage --reporter=verbose` | 0. 8 files, 68 tests, including `error-reporting.adapter.test.ts` | PASS |
| C02 | @borso-app/last-loop-lepin | same, filtered to the app | 0. 2 files, 18 tests, including `error-reporting.adapter.test.ts` | PASS |
| C03 | @borso-app/banana-rush | same | 0. 2 files, 20 tests, including `error-reporting.adapter.test.ts` | PASS |
| C04 | @borso-app/talos | same | 0. 4 files, 34 tests, including `error-reporting.adapter.test.ts` | PASS |
| C05 | four apps, e2e | `pnpm --filter @borso-app/<app> run test:e2e --changed $(git rev-parse origin/main)` | 0 ×4. pragma 50 files / 459 tests, last-loop-lepin 13 / 64, banana-rush 5 / 43, talos 26 / 155 | PASS |
| C06 | gated `.adapter` files | `scripts/mutate-changed.sh $(git rev-parse origin/main) apps/pragma apps/last-loop-lepin apps/banana-rush apps/talos` | 0. Four runs on `error-reporting.adapter.ts`: 43, 41, 49 and 48 mutants, all killed, score 100.00 against break threshold 100 | PASS |
| C07 | `*.utils.ts` | `git diff --name-only` | No `*.utils.ts` touched | PASS |

## D. Test coverage of spec

| # | Use case | Covering test | Verdict |
|---|---|---|---|
| D01 | pragma passes `ignoreSpans: [{ op: 'middleware' }]` | `it('starts the SDK with every personal data category off, …')` at apps/pragma/api/src/helpers/observability/error-reporting.adapter.test.ts:55. Assertion `expect(sentry.init).toHaveBeenCalledWith({ … ignoreSpans: [{ op: 'middleware' }], … })` at :58 and :75. It is an exact object match, so dropping or changing the option fails it. The mutation run killed every mutant of the constant. | PASS |
| D02 | last-loop-lepin passes it | `it('starts the SDK tagged with the app in the shared project, …')` at apps/last-loop-lepin/…/error-reporting.adapter.test.ts:49, assertion `toHaveBeenCalledWith` at :52 with `ignoreSpans: [{ op: 'middleware' }],` at :69 | PASS |
| D03 | banana-rush passes it | `it('traces under the release with every personal data category off, …')` at apps/banana-rush/…/error-reporting.adapter.test.ts:50, assertion at :59 with `ignoreSpans: [{ op: 'middleware' }],` at :76 | PASS |
| D04 | talos passes it | `it('starts tracing tagged talos, …')` at apps/talos/…/error-reporting.adapter.test.ts:55, assertion at :58 with `ignoreSpans: [{ op: 'middleware' }],` at :80 | PASS |
| D05 | The middleware span is gone and the request and database spans are kept | **structural:** the pattern is pinned exactly by D01–D04. With Sentry 11.6.0 (lockfile), `wrapMiddlewareSpan.js:25` sets op `middleware`, and `should-ignore-span.js:25` with `string.js:74` (substring match) drops it and nothing whose op lacks `middleware`. Confirmed by the bundled probe in the preamble. No repo test exercises the SDK's filtering (see Notes). | PASS |

## E. Scale

| # | Write path or state | Question | Failing case, or the key or test that holds it | Verdict |
|---|---|---|---|---|
| E01 | none | Write paths and per-process state | `git diff origin/main...HEAD -- '*.service.ts' '*.repository.ts' '*.controller.ts'` is empty, and no added line matches `insert(`, `update(`, `delete(`, `onConflict`, `transaction(`, `new Map`, `new Set` or `let`. The only module-level addition is the immutable configuration constant `UNREPORTED_SPANS`. | PASS |

## Blocking findings

- none

## Non-blocking findings

- A09 — no plan exists for the change. The brief records the operator's approval of the one-line approach in its place.
- B10 — the four startup tests now also pin the middleware rule, and none of their names says so (pragma :55, last-loop-lepin :49, banana-rush :50, talos :55).

## Notes

- No repo test would catch a Sentry upgrade that renames the Hono middleware op. The unit tests pin the option and not the SDK's behaviour. An op such as `function.hono` would leave all four unit tests green while the spans return. Should the existing `infra/cdk` fixture test that bundles `postgres` with the plugin also bundle a Hono middleware and assert that no `middleware` span is sent? It is a regression guard on a third-party contract and nothing breaks today, so it carries no row.
- `ignoreSpans` matches op by substring (`string.js:74`), so any future span whose op merely contains `middleware` (an Express-style `middleware.express`) would also be dropped. No such span exists in these apps today (inferred from their `hono` dependency). Is the broader match intended, or should the pattern be `/^middleware$/`?
- The Revision's figures (446 `middleware` spans against 282 `http.server` spans in the first prod hour) are labelled as measured with Sentry's span search. This validator did not re-query Sentry, so the count is unverified here. The code behaviour it motivates is verified by A05 and A06.

## Verdict: PASS
