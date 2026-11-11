---
summary: 'Sentry 11 sends browser spans as span v2 envelope items, not transactions, and turns its Postgres integrations on with any tracesSampleRate, yet the bundled Lambdas send no database span; count span v2 items, and check database spans in prod only.'
triggers:
  paths:
    - 'apps/*/api/src/helpers/observability/error-reporting.adapter.ts'
    - 'apps/*/site/src/observability/error-reporting.adapter.ts'
  output:
    - 'vnd\.sentry\.items\.span\.v2'
    - 'postgresJsIntegration'
---

# Sentry 11 tracing is not what Sentry 8 tracing was

PR #295 moved every app to tracing on `@sentry/react` and `@sentry/aws-serverless`
11. Three behaviours differed from what the agents expected, each measured on
that pull request.

## Browser spans travel as span v2 items

A page load in Sentry 11 sends its spans as envelope items of type
`application/vnd.sentry.items.span.v2+json`, one item per span. It sends no
`transaction` item whose `spans` array holds them. A counter that reads
`transaction.spans` from the envelope reports zero spans for a page that sent
seventeen (measured on borso-fr, 17 spans, and borsouvertures, 18). Count the
span v2 items when you budget spans against the plan's quota.

## Postgres spans turn on with the sample rate

Setting `tracesSampleRate` turns on `postgresJsIntegration` and the other
database integrations by default. Each span is named after the sanitized SQL
text. talos runs the agent's own SQL through `POST /api/agent/sql`, so its
adapter drops those integrations by name with `selectTracedIntegrations`
(`apps/talos/api/src/helpers/observability/error-reporting.adapter.ts`).
pragma, last-loop-lepin and banana-rush keep them, as
[ADR-2026-11-11T1903](../adr/2026-11-11T1903-every-app-traces-to-sentry-at-full-rate.md)
records. Read the default integration list before you trust that a span holds
only what you wrote.

## The bundled Lambdas send no database span at all

Sentry's search over prod spans with `span.op:db*` returned nothing for the 7
days before 2026-11-11 23:10 UTC, while pragma's API sent 33 `http.server`
spans in the last hour of that window (measured with the Sentry
`search_traces` tool). pragma has traced at 1.0 since ADR-2026-10-10T0457, so
the integration that the sample rate turns on yields no span from the bundled
`postgres` driver. Why is inferred, not measured: the Lambdas are bundled, and
the integration instruments the driver as a module it loads, which a bundle
does not load. So the talos filter above is defence for the day spans appear,
and a spec that promises database timing in a trace promises something no app
has. Only prod has a DSN, so prod is the only place to check it, with that same
query after a deploy.
