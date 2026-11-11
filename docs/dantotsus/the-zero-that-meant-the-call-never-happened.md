---
date: 2026-11-11
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#281'
fix-pr: '#288'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/quality/quality-dashboard.core.ts]
time-to-detect: days
tags: [sentry, quality-dashboard, observability, mcp, third-party, testing, meta]
zone: scripts/quality/quality-dashboard.core.ts
weak-point: gate-measures-nothing
recurs: none (the earlier quality-dashboard entries are about the page drawing wrongly, not about the data meaning something it does not)
---

# The zero that meant the call never happened

## User impact

Refreshing the 3S board calls Sentry once per application for the open-issue
count. On 2026-11-11 two of those six calls returned HTTP 400. Nothing in the
builder could tell a refused call from a quiet application, so the board was
one careless step away from publishing "0 open issues" for two applications
whose issue count was never read.

| | Seen | Expected |
| --- | --- | --- |
| Sentry issues open, `last-loop-lepin` and `borso-fr`, after two refused calls | `0`, marked ok | unavailable, with the reason |

The operator caught it that time by noticing the 400s. The board gave no sign.

## Causal chain

- The board would show `0 open issues` for an application nobody counted
  - `buildSentryIssueIndicators` returned `current: 0, status: { kind: 'ok' }`
    for that application
    - It summed `reading.value.filter((count) => count.app === app)` and an
      empty array reduces to `0` with the seed the code passes
      - Nothing distinguished "the collector wrote `count: 0`" from "the
        collector wrote no row at all"
        - The collector cannot write a row for a call that returned 400
          - Two of the six `search_issues` calls returned
            `400 Invalid query. Project(s) <name> do not exist`
            - The Sentry MCP runs an agent over `query` before Sentry sees
              it, and it rewrote a bare `app:<value>` tag filter into a
              project filter

## Root cause of occurrence

*Thought an application missing from the Sentry rows means it had nothing,
actually it means the call that would have counted it never landed.*

The snapshot carries two Sentry sources that look alike and mean opposite
things by absence. `.claude/skills/quality-dashboard/SKILL.md` defines them a
few lines apart:

> **`sentry`**. Call `search_errors` with `fields: ["app", "environment", "count()"]`

> **`sentryIssues`**. Call `search_issues` once per app [...] and record
> `{ "app", "count" }` with the number of issues returned.

`search_errors` groups, so an application that threw nothing has no row and
absence genuinely is zero. `sentryIssues` is built one call per application,
so every application is supposed to have a row and absence can only mean the
call failed. `sumSentry` and `buildSentryIssueIndicators` were written to the
same shape, and the second inherited a meaning that was only ever true of the
first.

The test locked it in. `quality-dashboard.core.test.ts` passed `['pragma',
'talos', 'nowhere']` with rows for `pragma` only, and asserted:

```ts
expect(find(indicators, 'sentry-issues-open', 'talos')?.current).toBe(0);
```

That is the defect, written down as the expectation, at 100% coverage.

## Detection failure causes

- **Typing:** `readonly SentryIssueCount[]` cannot say "one row per Sentry
  application". A list of pairs admits a list that is missing half of them.
- **Tests:** the only case for a missing row asserted `0`, so coverage and
  mutation were both satisfied by the wrong answer.
- **The gates:** 100% statements, branches and mutation score all passed. The
  branch that would have been wrong did not exist, so no gate could measure
  it. This is `gate-measures-nothing` seen from the other side: the gate was
  honest, the code simply had no place for the question.
- **The board:** `0` and `ok` render exactly like a real zero. An unavailable
  source is drawn differently, and that path existed already for a whole
  source, never for one application inside one.

## Countermeasure

A Sentry application with no row in `sentryIssues` is unavailable, not zero.

Two options were weighed. Refusing the whole snapshot at parse time, in
`snapshotSchema`, would be stricter but blunt: one refused call out of six
would throw away the five that worked and the rest of the board with them.
Marking the one application unavailable keeps every other number and shows the
reader exactly which figure is missing, which is what the board already does
for a whole source. Taken.

## Eradication

**Type:** structural impossibility (level 1)

A zero is now reachable only from a row that says `count: 0`. No arrangement
of inputs produces `current: 0` for an application the collector did not
write, so the failure mode cannot be expressed.

**Reference:** PR #288 · the commit adding this file

```diff
+const NO_ISSUE_ROW_REASON = 'no issue count collected for this app';
...
     const own = reading.value.filter((count) => count.app === app);
+    if (own.length === 0)
+      return {
+        ...base,
+        current: null,
+        status: { kind: 'unavailable', reason: NO_ISSUE_ROW_REASON },
+      };
     return {
       ...base,
       current: own.reduce((total, count) => total + count.count, 0),
```

The skill now also quotes the tag value and says both rules at the point of
collection, so the upstream 400 gets rarer; the vendor behaviour itself is in
[`../knowledge/sentry-search-tools-rewrite-the-query-before-sentry-sees-it.md`](../knowledge/sentry-search-tools-rewrite-the-query-before-sentry-sees-it.md).
That is defence in depth. The board no longer depends on it.

**Proof it can fail:** the guard was removed from a scratch copy and the new
test refused it:

```
FAIL scripts/quality/quality-dashboard.core.test.ts > Sentry issues >
  refuses to read a missing row as zero, because the call that fills it can fail
AssertionError: expected { id: 'sentry-issues-open', …(7) } to match object { current: null, status: { …(2) } }
-   "current": null,
+   "current": 0,
-     "kind": "unavailable",
-     "reason": "no issue count collected for this app",
```

The guard was restored and all 37 tests in the file pass.

**Similar instances:** `grep -n 'reduce((total' scripts/quality/*.core.ts`
finds `sumSentry` and this function. `sumSentry` reads `sentry`, where the
collector groups and absence is a true zero, so it is correct as written and
was left alone. `buildBugReportIndicators` filters pragma's reports from one
list fetched in one call, so a failure there makes the whole source
unavailable and never one application.
