---
date: 2026-11-12
introduced-at: conception
detected-at: production
severity: medium
related-pr: '#295'
fix-pr: none (the kaizen pull request of PR #295 lands it; its number is not known when this is written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [infra/cdk/src/constructs/lambda-api.ts, infra/cdk/src/internal/handler-bundle.utils.ts, infra/cdk/src/internal/handler-bundler.mjs]
time-to-detect: 7 days in pragma, one hour in the other apps
tags: [observability, cdk, pragma, last-loop-lepin]
zone: infra/cdk/src/constructs/lambda-api.ts
weak-point: prose-stands-in-for-a-check
recurs: none (the-preview-that-could-not-prove-tracing is why nobody saw it before prod, not why the span did not exist)
---

# The database span the bundle could not emit

## User impact

The operator gets no database time in any trace. Spec use case 7 of PR #295
promised it, and pragma had traced at full rate since ADR-2026-10-10T0457.

| | Seen | Expected |
| --- | --- | --- |
| Sentry, `span.op:db*` in prod, 7 days to 2026-11-11 23:10 UTC | no span | a `db` span under each request that queries |
| pragma-api in the last hour of that window | 33 `http.server` spans, no child | the same, each with its queries |

## Causal chain

- No database span reached Sentry
  - The `postgres` driver never published on Sentry's diagnostics channels
    - Sentry 11 instruments it by rewriting `postgres/src/query.js` and `connection.js`, at runtime through a module hook or at bundle time through a plugin
      - The Lambda inlines the driver, so the runtime hook sees no module to rewrite; Sentry printed "Failed to register diagnostics-channel injection hooks" at each cold start
        - `NodejsFunction` runs the esbuild command line, which takes no plugin
  - And no integration listened: `@sentry/aws-serverless`'s `init` installs `getDefaultIntegrationsWithoutPerformance()` (`build/npm/esm/init.js:27`)

## Root cause of occurrence

*Thought setting `tracesSampleRate` turns database spans on, actually on a
bundled Lambda it needs an integration listed by hand and the driver
rewritten at bundle time.*

The talos agent of PR #295 logged "Sentry SDK 11 enables
postgresJsIntegration by default once tracesSampleRate is set". That holds
for `@sentry/node`'s own `init`, not for `@sentry/aws-serverless`'s. The spec
promised the spans on a measurement from an older SDK, which the validator
logged as unverifiable.

## Detection failure causes

- **Local and preview:** no DSN outside prod, so no run before the merge
  could show a missing span.
- **Tests:** every adapter test mocks Sentry, so none sees what the SDK installs.
- **Prod logs:** the warning was printed at every cold start; no one read it
  until PR #298 chased cold-start time.

## Countermeasure

A local probe built the Lambda's bundle shape four ways and counted spans
with `beforeSendSpan`. Only the integration and the plugin together gave
`db` spans. The same holds with PR #298's settings
(`enableRuntimeChannelInjection: false`, `fetch_types: false`).

## Eradication

**Type:** structural impossibility (level 1). Every `LambdaApi` bundle passes
through Sentry's plugin, so no API can ship an uninstrumented driver; the
integration each app lists is pinned by its adapter test.

**Reference:** ADR-2026-11-12T0008 and the `feat(infra)` commit beside this file.

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
postgres driver` synthesizes a fixture that imports `postgres` and nothing
from Sentry, and asserts the bundle holds `orchestrion:postgres:handle`. With
`plugins: []`: `FAIL … expect(synthBundle({ entry: POSTGRES_ENTRY }).code).toContain(ORCH… ❯ test/unit/lambda-api.test.ts:155:57`, exit 1. Restored, it passes.

**Similar instances:** `grep -rn "new NodejsFunction" infra/cdk/src apps/*/cdk/lib`
lists the websocket, migration runner, agent reader, origin verify and talos
job functions. None traces requests, so none needs the plugin.
