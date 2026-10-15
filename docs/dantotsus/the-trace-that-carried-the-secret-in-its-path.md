---
date: 2026-10-15
introduced-at: implementation
detected-at: review
severity: high
related-pr: '#118'
fix-pr: '#118'
fix-commits: [52684a2]
eradication-level: 1
eradication-paths: [apps/pragma/api/src/helpers/observability/error-reporting.core.ts, apps/pragma/api/src/helpers/observability/error-reporting.adapter.ts]
time-to-detect: minutes
tags: [pragma, security, observability, git]
zone: apps/pragma/api/src/helpers/observability
recurs: none (the first defect where two branches, each correct alone, leaked a secret only once merged)
---

# The trace that carried the secret in its path

## Symptom

PR #118 stores each member's secret iCal address and reads it on every visit
to the Sessions page. While main was being merged into the branch, #163 arrived
with Sentry for the pragma API, tracing every request. Reading the merged
adapter showed that every free-slot read would have sent each member's address
to Sentry, in an outgoing span and in a breadcrumb:

```
GET https://calendar.google.com/calendar/ical/member%40example.com/private-0123abcd/basic.ics
```

Nothing failed. Every test on both branches was green, and the merge itself
raised one conflict, an import line in `app.ts`.

## Root-cause chain

1. **Why would the address reach Sentry?** `@sentry/aws-serverless` 11.6
   instruments `fetch` and records each outgoing request's URL as a span name
   and a breadcrumb. `dataCollection.urlQueryParams: false` strips the query,
   and the rest of the URL is kept.
2. **Why is the path a secret?** A provider's secret iCal address carries its
   token in the path, not in the query. Google's is
   `/calendar/ical/<id>/private-<token>/basic.ics`.
3. **Why did #163 not account for it?** When #163 was written, the API's
   only outgoing calls went to Deezer and Spotify, whose paths hold nothing
   private. Its ADR switches off every personal-data category Sentry names,
   and none of them covers a URL path.
4. **Why did #118 not account for it?** #118 was written before Sentry existed
   in pragma. Its ADR states that the address never leaves the API, which was
   true until the merge.

**Root cause:** both branches treated "personal data collection off" as
covering every secret, but Sentry's categories describe where personal data
usually lives, and an address that carries its credential in the path falls
outside all of them.

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

- **Code:** in PR #118, squashed as `52684a2`: Sentry records an outgoing call
  only when its host is one the API names itself.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #118](https://github.com/hugoleborso/borso.fr/pull/118) ·
commit [`52684a2`](https://github.com/hugoleborso/borso.fr/commit/52684a2bb1dd1a4fcfc541581c42c8288c5aeee5)

**The actual fix:**

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

The list allows hosts rather than refusing them, so a host nobody listed is
never recorded. A new outgoing call to a member-supplied address, a webhook or
another calendar provider stays out of Sentry until someone adds its host on
purpose. The adapter test asserts the integration is passed, and the core is
mutation-tested at 100%.

**Sibling defects swept:** the AWS SDK goes through Node's `http` module, not
`fetch`, so its calls are not recorded by this integration. Its URLs carry no
secret in any case: SSM parameter names travel in the request body, and DSQL
signs its token locally.

## See also

- [ADR-0031](../adr/0031-pragma-reports-errors-and-traces-to-sentry-eu.md):
  Sentry in pragma, personal data collection off.
- [ADR-0037](../adr/0037-calendar-feed-address-in-its-own-table.md): the
  address is plain text in a table of its own and never leaves the API.
