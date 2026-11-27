---
date: 2026-11-12
introduced-at: conception
detected-at: production
severity: medium
related-pr: '#295'
fix-commits: [self]
eradication-level: 4
eradication-paths: [infra/cdk/src/constructs/lambda-api.ts, infra/cdk/src/internal/handler-bundle.utils.ts, infra/cdk/src/internal/handler-bundler.mjs, apps/pragma/api/src/helpers/observability/error-reporting.adapter.test.ts]
time-to-detect: 7 days in pragma, one hour in the other apps
tags: [observability, cdk, pragma, last-loop-lepin]
zone: infra/cdk/src/constructs/lambda-api.ts
weak-point: prose-stands-in-for-a-check
recurs: none (the-preview-that-could-not-prove-tracing is why nobody saw it before prod, not why the span did not exist)
---

# The database span the bundle could not emit

## User impact

The operator saw no database time in any trace, so a slow request could not be
split between the Lambda and the database.

| | Seen | Expected |
| --- | --- | --- |
| Sentry, `span.op:db*` in prod, 7 days to 2026-11-11 23:10 UTC | no span (measured in the PR #295 sweep) | a `db` span under each request that queries |
| pragma-api in the last hour of that window | 33 `http.server` spans, no child | the same, each with its queries |

PR #295 rested on those spans. Its spec use case 7 guards the SQL text they
carry, and ADR-2026-11-11T1903 says tracing turns the `Postgres` and
`PostgresJs` integrations on by default. The spec's *Out of scope* lists
"Database spans" as new work, so nobody planned to add them. Every API was
affected.

## Causal chain

- No database span reached Sentry.
  - No integration listened. `@sentry/aws-serverless`'s `init` installs
    `getDefaultIntegrationsWithoutPerformance()` (`build/npm/esm/init.js:27`),
    and each adapter listed none by hand.
    - The talos agent of PR #295 logged "Sentry SDK 11 enables
      postgresJsIntegration by default once tracesSampleRate is set", and
      ADR-2026-11-11T1903 line 93 repeats it, "read in the 11.6.0 source". That
      default lives in `@sentry/node`'s `init`, not in the serverless one
      (Material).
  - The `postgres` driver never published on Sentry's diagnostics channels.
    - Sentry 11 instruments it by rewriting `postgres/src/query.js` and
      `connection.js`, at runtime through a module hook or at bundle time
      through a plugin.
      - The Lambda inlines the driver, so the runtime hook finds no module.
        Sentry printed "Failed to register diagnostics-channel injection
        hooks" at each cold start.
        - `NodejsFunction` runs the esbuild command line, which takes no
          plugin.
  - The pull request merged with the question open.
    - The technical validator wrote in its Notes, "Nothing in the repo applies
      that transform, and the ADR relies on ADR-2026-10-10T0457's measurement
      on pragma. A preview trace of a database-backed route would settle it."
      It graded the row A13 PASS
      (`docs/features/meta/sentry-tracing-all-apps/validation/technical-validation-2026-11-11-1908.md:130`).
      - The validator's template puts "any concern that has no failing case
        yet" in Notes, which block nothing, and previews carry no DSN, so no
        probe could fail (Method).

## Root cause of occurrence

*Thought setting `tracesSampleRate` turns database spans on, actually on a
bundled Lambda under `@sentry/aws-serverless` the integration must be listed by
hand and the driver rewritten at bundle time.* (Material)

The writer read the integration default in the shared Sentry source. The
serverless `init` that overrides it was a different file, and nothing in the
brief pointed at it (inferred). ADR-2026-10-10T0457 had measured "a bundled run
produced no `db` span", and blamed only the inlined module.

## Detection failure causes

- **Local and preview:** no DSN outside prod, so no run before the merge could
  show a missing span.
- **Tests:** every adapter test mocks Sentry, so none sees what the SDK
  installs.
- **Validation:** the doubt was written down and graded non-blocking, because
  it named no failing case.
- **Prod logs:** the warning printed at every cold start. Nobody read it until
  PR #298 chased cold-start time.

## Countermeasure

A local probe built the Lambda's bundle four ways and counted spans with
`beforeSendSpan`. Only the integration and the plugin together gave `db` spans.
The same holds with PR #298's settings (`enableRuntimeChannelInjection: false`,
`fetch_types: false`).

## Eradication

**Type:** detection (level 4) for the class. The driver rewrite is
structural: every `LambdaApi` bundle passes through Sentry's plugin. The
integration is listed by hand in each app's adapter and pinned only by that
app's own test, so a new app can ship without it.

**Reference:** ADR-2026-11-12T0008 and the `feat(infra)` commit beside this
file.

```diff
-    this.handler = new NodejsFunction(this, 'Fn', {
-      entry: props.entry,
+    this.handler = new LambdaFunction(this, 'Fn', {
+      code: bundleHandlerCode(props.entry, props.sourceMapUpload),
+      handler: BUNDLED_HANDLER,
```

```js
await build({ ...JSON.parse(serializedBuildOptions), plugins: [sentryOrchestrionPlugin()] });
```

**Proof it can fail:** the test `LambdaApi handler bundle > rewrites the
postgres driver` synthesizes a fixture that imports `postgres` and nothing from
Sentry, and asserts the bundle holds `orchestrion:postgres:handle`. With
`plugins: []` it fails at `test/unit/lambda-api.test.ts:155:57`, exit 1.
Restored, it passes.

**Similar instances:** `grep -rln postgresJsIntegration apps/*/api/src` finds
five adapters and five tests that each list the integration by hand.
`grep -rn "new NodejsFunction" infra/cdk/src apps/*/cdk/lib` lists the
websocket, migration runner, agent reader, origin verify and talos job
functions. None traces requests, so none needs the plugin.

**Proposed:** two changes. First, have `LambdaApi` own the tracing contract:
synthesize a bundle test per app, beside the existing fixture test, that
fails when the app's handler bundle never calls `postgresJsIntegration`. A new
app then cannot ship a driver nobody listens to. Second, make the technical
validator grade a spec use case whose evidence it cannot obtain as an
UNVERIFIABLE row with a blocking type, not a note. A pull request whose
premise no run can show then stops for a probe before merge.
