---
date: 2026-10-15
introduced-at: implementation
detected-at: review
severity: high
related-pr: '#118'
fix-commits: [52684a2]
eradication-level: 1
eradication-paths: [apps/pragma/api/src/helpers/observability/error-reporting.core.ts, apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts]
time-to-detect: minutes
tags: [pragma, security, observability, git]
zone: apps/pragma/api/src/helpers/observability
recurs: none (the first defect where two branches, each correct alone, leaked a secret only once merged)
---

# The trace that carried the secret in its path

## User impact

PR #118 stores each member's secret iCal address and reads it on every visit
to the Sessions page. While main was being merged into the branch, #163
arrived with Sentry for the pragma API, tracing every request. Reading the
merged adapter showed that every free-slot read would have sent each
member's address to Sentry, in an outgoing span and in a breadcrumb:

```
GET https://calendar.google.com/calendar/ical/member%40example.com/private-0123abcd/basic.ics
```

| | Seen | Expected |
| --- | --- | --- |
| Outgoing span for a free-slot read | the full calendar URL, token in the path | no span, or the host only |

Anyone with access to the Sentry project could have read every member's
calendar. Nothing failed. Every test on both branches was green, and the
merge raised one conflict, an import line in `app.ts`. It was caught in
review before deploy, so no address reached Sentry.

## Causal chain

- Every free-slot read would send a member's secret address to Sentry.
  - `@sentry/aws-serverless` 11.6 instruments `fetch` and records each
    outgoing request's URL as a span name and a breadcrumb.
    `dataCollection.urlQueryParams: false` strips the query and keeps the
    rest of the URL.
    - A provider's secret iCal address carries its token in the path, not in
      the query. Google's is `/calendar/ical/<id>/private-<token>/basic.ics`.
  - The merged adapter passed `dataCollection: PRIVATE_DATA_COLLECTION` and
    no filter on outgoing requests.
    - #163 switched off every personal-data category Sentry names, and none
      covers a URL path. When it was written, the API's only outgoing calls
      went to Deezer and Spotify, whose paths hold nothing private.
      - Its writer built from Sentry's published data categories, which
        describe where personal data usually lives (Material).
    - #118 was written before Sentry existed in pragma. Its ADR states that
      the address never leaves the API, which was true until the merge.

## Root cause of occurrence

*Thought "personal data collection off" covered every secret, actually
Sentry's categories describe where personal data usually lives, and an
address that carries its credential in the path falls outside all of them.*
(Material)

Both branches built from the same input, Sentry's category list, and each
was correct alone. ADR-2026-10-10T0457 records the choice: Sentry in pragma,
personal data collection off.

## Detection failure causes

- **Typing:** a URL is a `string` on both sides; nothing marks one as secret.
- **Tests:** each branch's tests held on its own. The adapter test asserted
  the options passed to `Sentry.init`, and those were correct for the
  outgoing calls #163 knew about.
- **Merge:** git merged both changes without a conflict on any line that
  mattered. The conflict that did occur was an import line in `app.ts`.
- **Review:** caught here, by reading the merged adapter with the free-slot
  calls in mind.

## Countermeasure

In PR #118, squashed as `52684a2`, Sentry records an outgoing call only when
its host is one the API names itself.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit [`52684a2`](https://github.com/hugoleborso/borso.fr/commit/52684a2bb1dd1a4fcfc541581c42c8288c5aeee5) (PR #118).

```diff
+const RECORDED_OUTGOING_HOSTS: ReadonlySet<string> = new Set([
+  'api.deezer.com',
+  'accounts.spotify.com',
+  'api.spotify.com',
+]);
+
+export function isUnrecordedOutgoingRequest(url: string): boolean {
+  if (!URL.canParse(url)) return true;
+  return !RECORDED_OUTGOING_HOSTS.has(new URL(url).hostname);
+}
```

```diff
     dataCollection: PRIVATE_DATA_COLLECTION,
+    integrations: [
+      Sentry.nativeNodeFetchIntegration({ ignoreOutgoingRequests: isUnrecordedOutgoingRequest }),
+    ],
```

The list allows hosts rather than refusing them, so in pragma a host nobody
listed is never recorded. A new outgoing call to a member-supplied address,
a webhook or another calendar provider stays out of Sentry until someone
adds its host on purpose. The adapter test asserts the integration is
passed, and the core is mutation-tested at 100%. talos's adapter passes the
same `ignoreOutgoingRequests` filter.

The level holds for pragma and talos, not for the class. `banana-rush`,
`borsouvertures`, `last-loop-lepin` and `skull-king` each have an
`api/src/helpers/observability/error-reporting.adapter.ts` with
`integrations: [Sentry.postgresJsIntegration()]` and no
`ignoreOutgoingRequests` (`grep -n "integrations\|ignoreOutgoing" apps/*/api/src/helpers/observability/error-reporting.adapter.ts`,
measured 2026-11-27). None of their APIs calls `fetch` today
(`grep -rln "fetch(" apps/<app>/api/src` finds nothing outside tests), so
nothing leaks now. Their first `fetch` to a URL with a secret in its path
would be recorded, since a listed integration adds to Sentry's defaults
rather than replacing them (inferred from Sentry's integration model, not
measured here).

**Proof it can fail:** the core's tests refuse an unlisted host and an
unparsable URL, and mutation testing kills every mutant of
`isUnrecordedOutgoingRequest`.

**Proposed:** make outgoing calls default-deny in every app. Each of the four
adapters would pass `nativeNodeFetchIntegration({ ignoreOutgoingRequests })`
with a host allowlist that starts empty, as pragma's does with three hosts.
The error-reporting adapter shape would carry the filter, so a new app
copying it starts closed. A future `fetch` to a secret URL could then not
reach Sentry in any app without a host added on purpose.

**Similar instances:** the AWS SDK goes through Node's `http` module, not
`fetch`, so its calls are not recorded by this integration. Its URLs carry no
secret in any case: SSM parameter names travel in the request body, and DSQL
signs its token locally. The four apps above are the open instances.

**Related.**

- [ADR-2026-10-10T0457](../adr/2026-10-10T0457-pragma-reports-errors-and-traces-to-sentry-eu.md):
  Sentry in pragma, personal data collection off.
- [ADR-2026-10-02T1352](../adr/2026-10-02T1352-calendar-feed-address-in-its-own-table.md): the
  address is plain text in a table of its own and never leaves the API.
