# ADR-2026-11-12T0008: API Lambdas bundle with Sentry's esbuild plugin

- **Status:** proposed
- **Date:** 2026-11-12
- **Deciders:** Hugo Borsoni
- **Tags:** lessons-from-pr-295, cdk, observability

## Context

[ADR-2026-11-11T1903](./2026-11-11T1903-every-app-traces-to-sentry-at-full-rate.md)
turned on tracing in every app, and its spec's use case 7 promised database
spans. None arrives: Sentry returned no `span.op:db*` span in prod for the 7
days before 2026-11-11 23:10 UTC, pragma included (measured with the Sentry
`search_traces` tool). A local probe on the Lambda's bundle shape found two
causes, both needed for a span. `Sentry.init` from `@sentry/aws-serverless`
installs no Postgres integration, and Sentry 11 instruments the `postgres`
driver by rewriting its source to publish on diagnostics channels, which for
an inlined driver only a bundler plugin can do. CDK's `NodejsFunction` runs
the esbuild command line and takes no plugin. Open PR #298 turns Sentry's
runtime module hook off in pragma, because it spawns a worker thread at every
cold start and fails in a bundle anyway.

| Integration listed | Sentry's esbuild plugin | Spans the probe saw |
| --- | --- | --- |
| no, as deployed | no, as deployed | `http.server` only |
| no | yes | `http.server` only |
| yes | no | `http.server` only |
| yes | yes | `http.server`, and `db` spans named `select` |

## Criteria

| Criterion | Raised by | Weight | Why it matters | How it is measured |
|---|---|---|---|---|
| Does it change the app for its users | operator | low | A user sees nothing; the operator reads where a slow request spends its time | a `db` span under a request span in Sentry |
| Database time shows in traces | operator | high | The operator asked why no database span arrives and asked for the fix | `span.op:db*` in prod after the deploy |
| One place holds the bundle options | author | medium | Two copies of the esbuild options drift, and a drifted copy ships silently | the number of files that state them |
| Cold start | author | medium | pragma's p95 is cold starts (ADR-2026-11-11T1658), and PR #298 is cutting them | bundle bytes, measured; time unknown until prod |

## Decision

**Own esbuild step in `LambdaApi`.** `LambdaApi` builds its handler as a
`lambda.Function` whose code is a local-bundling asset: a child Node process
calls esbuild's `build` with the options `NodejsFunction` used before, plus
`sentryOrchestrionPlugin` from `@sentry/server-utils/orchestrion/esbuild`,
then runs the existing `sentry-cli` source-map upload. pragma,
last-loop-lepin and banana-rush list `postgresJsIntegration()`; talos lists
none, because its agent endpoint runs arbitrary SQL. last-loop-lepin,
banana-rush and talos set `enableRuntimeChannelInjection: false`, which
PR #298 sets for pragma. The three apps that list the integration pass
`redactDatabaseSpan` as `beforeSendSpan`, so no SQL text or table name reaches
Sentry. It is the only option that yields database spans
with the options in one place.

## Consequences

- `+` A request's trace shows its database time, with the operation as the span name, such as `SELECT`, and no SQL, table or value. `databaseQueryData: false` drops only the values, so each app passes `redactDatabaseSpan` as `beforeSendSpan` to remove `db.query.text` and `db.query.summary` (measured on a probe query naming a table).
- `+` Sentry's startup warning "Failed to register diagnostics-channel injection hooks" stops, and the three apps lose the runtime hook's worker thread, as pragma does in PR #298.
- `-` pragma's API bundle grows 20,963 bytes, from 2,028,390 to 2,049,353 (measured). What that costs a cold start is unknown until prod.
- `-` `LambdaApi` owns its bundling: a CDK upgrade that improves `NodejsFunction` bundling no longer reaches it, and `infra/cdk` now depends on `esbuild` and `@sentry/server-utils` at synth time.
- `-` The plugin warns at every synth that `@aws-sdk/smithy-client` is external, because its `instrumentations` option only adds to Sentry's list and cannot narrow it.
- `~` The first database span can only be seen in prod: previews run with no DSN.

## Alternatives considered

### Option A — Own esbuild step in `LambdaApi` (chosen)

- **Raised by:** author; chosen by the operator on 2026-11-11
- **Summary:** As in *Decision*.
- **Strengths:**
  - Yields database spans, proven by the probe and pinned by a test that bundles a fixture importing `postgres` and finds `orchestrion:postgres:handle`.
  - The esbuild options live once, in `infra/cdk/src/internal/handler-bundle.utils.ts`.
- **Costs:** +20,963 bytes on pragma's bundle; two synth-time dependencies.
- **Rationale:** It is the only option that meets the high criterion without a second copy of the options.

### Option B — Re-run esbuild in `NodejsFunction`'s `afterBundling` hook (rejected)

- **Raised by:** author
- **Summary:** Keep `NodejsFunction` and overwrite its output with a second esbuild run that adds the plugin.
- **Strengths:** A smaller diff to `lambda-api.ts`.
- **Costs:** Every deploy bundles twice, and the options live in two places.
- **Rejection rationale:** Loses on *one place holds the bundle options*. Under equal weights it would still lose, because it buys nothing Option A lacks.

### Option C — Drop database spans (rejected)

- **Raised by:** author
- **Summary:** Record that no app traces its database, and keep bundling as it is.
- **Strengths:** No change and no bundle growth.
- **Costs:** Traces keep only request spans.
- **Rejection rationale:** Loses on *database time shows in traces*, the criterion the operator raised.

## Scores

|             | Option A | Option B | Option C |
|---|---|---|---|
| Database time shows in traces | ✓ probe and fixture test | ✓ same plugin | ✗ none |
| One place holds the bundle options | ✓ one utils file | ✗ two copies | ✓ unchanged |
| Cold start | ✗ +20,963 bytes | ✗ the same bytes | ✓ unchanged |

## Implementation pointers

- Spec: `docs/features/meta/sentry-tracing-all-apps/spec/spec.md` (use case 7)
- Plan: none; the inventory row is `docs/features/meta/lessons-from-pr-295/inventory.md` row 08
- Commit: stamped by `/after-task-kaizen` on merge
- Files: `apps/*/api/src/helpers/observability/database-span.core.ts`, `infra/cdk/src/constructs/lambda-api.ts`, `infra/cdk/src/internal/handler-bundle.utils.ts`, `infra/cdk/src/internal/handler-bundler.mjs`, `apps/*/api/src/helpers/observability/error-reporting.adapter.ts`
- Related ADRs: builds on ADR-2026-11-11T1903 and ADR-2026-11-11T1658
