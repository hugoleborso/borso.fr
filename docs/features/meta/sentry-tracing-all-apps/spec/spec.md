# Every app traces to Sentry as pragma does

The operator asked for this directly on 2026-11-11. The decision and its measured span quota are in [ADR-2026-11-11T1903](../../../../adr/2026-11-11T1903-every-app-traces-to-sentry-at-full-rate.md), which builds on [ADR-2026-10-10T0457](../../../../adr/2026-10-10T0457-pragma-reports-errors-and-traces-to-sentry-eu.md).

## Goal

Every borso.fr app gets the Sentry tracing pragma already has. Each API's wide event lands on its request span, as pragma's does. pragma is the reference and does not change.

## Use cases

### APIs: last-loop-lepin, banana-rush, talos

1. With a DSN and a reporting stage, the SDK starts with `tracesSampleRate` 1 and with `release` set from `SENTRY_RELEASE` when that variable is set.
2. Each HTTP request runs inside one `http.server` span that continues the caller's `sentry-trace` and `baggage`. The span is named `<METHOD> <matched route>` and carries the HTTP status.
3. Without a DSN, or outside a reporting stage, a request is answered with no span and no flush.
4. The tracing middleware runs before the wide-event middleware. The wide event's `trace.id` is the span's trace id, and every wide-event field is set as an attribute on the span. The event is still written to stdout.
5. A failure answered as 500 is reported, and Sentry is flushed before the Lambda returns.
6. No trace header is sent to any outgoing host.
7. No SQL text and no request body reaches a span. On talos this includes `POST /api/agent/sql`, and no secret URL reaches one either.
8. Personal data collection stays off, as in ADR-2026-10-10T0457.

### Stacks: last-loop-lepin, banana-rush, talos

9. When the deploy has a commit SHA (`GITHUB_SHA`), every API Lambda that has `SENTRY_DSN` also gets `SENTRY_RELEASE` set to that SHA. Without the SHA, the variable is absent.

### Sites

10. With a DSN and a reporting stage, every site traces at sample rate 1. A site that uses `react-router-dom` names its transactions after the matched route. Any other site uses the default browser tracing.
11. A site with an API sends `sentry-trace` and `baggage` only to `<its api origin>/api/`. That origin is the page's own origin in prod, and the preview's `-api` host on a preview. A look-alike host gets no header.
12. borso-fr and borsouvertures send trace headers to no host.
13. Personal data settings do not loosen on any site.

## Out of scope

- Source-map upload and site releases for apps other than pragma.
- Database spans.
- WebSocket and scheduled-job spans.
