---
summary: "Sentry 11 sends browser spans as span v2 envelope items, and a bundled Lambda sends a database span only with `postgresJsIntegration()` listed by hand and Sentry's esbuild plugin in the bundle; count span v2 items, and check database spans in prod."
triggers:
  paths:
    - 'apps/*/api/src/helpers/observability/error-reporting.adapter.ts'
    - 'apps/*/site/src/observability/error-reporting.adapter.ts'
  output:
    - 'vnd\.sentry\.items\.span\.v2'
    - 'postgresJsIntegration'
    - 'Failed to register diagnostics-channel injection hooks'
---

# Sentry 11 tracing is not what Sentry 8 tracing was

PR #295 moved every app to tracing on `@sentry/react` and `@sentry/aws-serverless`
11. Two behaviours differed from what the agents expected, measured on that
pull request and in its kaizen sweep. One agent also believed tracing turns
the Postgres integration on by default; on `@sentry/aws-serverless` it does
not, as the second section shows.

## Browser spans travel as span v2 items

A page load in Sentry 11 sends its spans as envelope items of type
`application/vnd.sentry.items.span.v2+json`, one item per span. It sends no
`transaction` item whose `spans` array holds them. A counter that reads
`transaction.spans` from the envelope reports zero spans for a page that sent
seventeen (measured on borso-fr, 17 spans, and borsouvertures, 18). Count the
span v2 items when you budget spans against the plan's quota.

## No database span reaches Sentry, for two reasons

Sentry's search over prod spans with `span.op:db*` returned nothing for the 7
days before 2026-11-11 23:10 UTC, while pragma's API sent 33 `http.server`
spans in the last hour of that window (measured with the Sentry
`search_traces` tool). A local probe found why, on 2026-11-11, with
`@sentry/aws-serverless` 11.6.0, `postgres` and esbuild 0.28.2 bundling as
`LambdaApi` does (ESM, `node22`, minified). Each line is one probe run against
the local Postgres, counting the spans `beforeSendSpan` saw:

| `postgresJsIntegration()` in `integrations` | Sentry's esbuild plugin | Spans |
| --- | --- | --- |
| no, the default list | no, as deployed | `http.server` only |
| no | yes | `http.server` only |
| yes | no | `http.server` only |
| yes | yes | `http.server`, and two `db` spans named `select` |

1. **The integration is never installed.** `Sentry.init` from
   `@sentry/aws-serverless` builds its defaults from
   `getDefaultIntegrationsWithoutPerformance()` plus the two AWS integrations
   (`build/npm/esm/init.js:27`). The debug log lists no Postgres integration.
   Only `@sentry/aws-serverless/awslambda-auto` adds the performance ones. So
   an app must list `postgresJsIntegration()` itself, and talos's filter in
   `selectTracedIntegrations` removes nothing today.
2. **The driver is never instrumented.** Sentry 11 instruments `postgres`
   through Orchestrion. Orchestrion rewrites `postgres/src/query.js` and
   `connection.js` to publish on diagnostics channels
   (`@sentry/server-utils/build/esm/orchestrion/config/postgres.js`). The
   rewrite happens in a runtime `--import` hook, which cannot see a module
   esbuild already inlined, or in a bundler plugin, which CDK's
   `NodejsFunction` cannot take. Sentry says so at startup: `Failed to
   register diagnostics-channel injection hooks, so channel-based
   integrations will not record spans.`

Sentry's plugin added 9,890 bytes to the minified probe bundle (381,079
against 390,969, measured).

`databaseQueryData: false` does not keep SQL out of a database span. It
drops the values, but the span still carries the whole statement in
`db.query.text` and its tables in its name and `db.query.summary`: measured on
2026-11-12 as `select iban from secret_members where email = $1`, in a span
named `select secret_members`. pragma, last-loop-lepin and banana-rush pass
`redactDatabaseSpan` from `database-span.core.ts` as `beforeSendSpan`, which
removes both attributes and names the span after `db.operation.name`, such as
`SELECT`. A probe on `select 1` shows no table and hides this.

Only prod has a DSN, so prod is the only place to check a change to this,
with the same `span.op:db*` query after a deploy.
