---
date: 2026-11-12
introduced-at: implementation
detected-at: ci
severity: low
related-pr: '#206'
fix-pr: '#298'
fix-commits: [e02feeb56, self]
eradication-level: 2
eradication-paths: [scripts/vitest-clock-at-the-paris-day-boundary.js, apps/pragma/vitest.config.ts, apps/talos/vitest.config.ts]
time-to-detect: days
tags: [pragma, talos, testing, vitest, ci]
zone: apps/pragma/api/src/mcp/tool-budget.test.ts
recurs: none (no earlier entry is about a test whose result depends on the hour it runs; the entries sharing pragma and testing are about what a test asserts)
---

# A test that failed one hour a night

## User impact

No band member saw it. The operator and two sessions did, on PR #298, a branch
that touched neither the test nor the tool it calls.

| | Seen | Expected |
| --- | --- | --- |
| CI, 23:03 and 23:30 UTC on 2026-11-11 | `app-tests (pragma-assistants)` red (report 0005, job 130858186156) | Green |
| Validation round 2, 23:31 UTC | A blocking finding for a cause outside the branch. The validator waited for midnight to tell the clock from the change | No finding |
| Any run from 23:00 to 24:00 UTC since 2026-10-29 | The same failure (inferred from the code, and reproduced with the clock moved to 23:31 UTC) | A pass |

## Causal chain

- The tool answered `session-not-found` for the reference `2026-11-17`.
  - The practice it was asked for was on 2026-11-18 in Paris.
    - The test saved it at `now` plus six days, to the millisecond. At
      23:31 UTC that instant is 00:31 the next day in Paris.
    - The test then named it by the UTC day of that instant:

```ts
const day = daysFrom(now, NEW_PRACTICE_IN_DAYS).toISOString();
await log.call('save_session', { kind: 'practice', date: day });
await log.call('save_setlist', {
  name: 'Mardi',
  session: day.slice(0, ISO_DAY_LENGTH),
```

## Root cause of occurrence

*Thought the first ten characters of an ISO instant are its day. Actually they
are its UTC day, and pragma's day is the Paris day, which is the next one
during the last hour of every UTC day in winter and the last two in summer.*

`apps/pragma/api/src/sessions/session-tool.core.ts:124` is where the tool
decides:

```ts
function isOnCalendarDay(session: DatedSession, day: RegExpExecArray): boolean {
  const { year, month, day: dayOfMonth } = parisCalendarDayOf(session.date);
```

## Detection failure causes

- **Typing:** `save_setlist` takes `session: string`. A UTC day and a Paris day
  are the same type.
- **Local and CI:** the test reads the real clock, and it passes 23 hours of
  24 in winter. The two red runs of 2026-11-11 are the first this sweep found.
  Earlier runs in that hour were not searched for.
- **Review:** the validator of PR #206 ran the test, and it passed at the hour
  it ran.

## Countermeasure

Commit `7937a89` of PR #298 saves the practice at noon UTC, where both zones
agree on the day. It was checked there with the clock moved: failing at
23:31 UTC before, passing at 23:49 UTC after.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit that adds this file.

Every test run of pragma and talos, the two apps that resolve a Paris day, now
starts its clock at 23:10 UTC of the current day and runs on from there. The
hour of the day is no longer an input of the suite. A test built on a UTC day
fails the first time its author runs it, at any hour, on any machine.

```diff
+const CLOCK_AT_THE_PARIS_DAY_BOUNDARY = ['../../scripts/vitest-clock-at-the-paris-day-boundary.js'];
+
 const databaseSuite = {
   globalSetup: ['./test/setup-postgres.ts'],
+  setupFiles: CLOCK_AT_THE_PARIS_DAY_BOUNDARY,
```

The setup file replaces `Date` with a subclass whose `now()` and empty
constructor are shifted by one offset, computed once. A date built from a
value is untouched, and `instanceof Date` still holds for a date the runtime
built. 23:10 leaves a run 50 minutes before midnight UTC. pragma's whole suite
takes about 10 here.

**Proof it can fail:** at 00:44 UTC by the real clock, with the test as it was
before `7937a89`:

```
+   "{\"error\":\"session-not-found\",\"reference\":\"2026-11-18\"}",
      Tests  1 failed | 2 passed (3)
```

and with the test as it is on `main`: `Tests  3 passed (3)`.

**Similar instances:** none found. Every suite of the repository was run with
the process clock moved, by a preload that shifts `Date` the same way.

| Clock | Shifted by | Result |
| --- | --- | --- |
| The real clock, 00:22 to 00:36 UTC | nothing | 9 workspaces of 9 pass, bar one root test this sweep was editing |
| 2026-11-12 23:31 UTC, a winter night | the preload | 9 of 9 pass, 10,664 tests |
| 2026-07-15 22:31 UTC, a summer night | the preload, and the boundary clock on pragma and talos | pragma, last-loop-lepin, banana-rush, borso-fr and borsouvertures pass. talos fails 3 tests whose fixtures carry dates after July: a proposal that expires on 2 November is not expired yet. A clock moved back proves nothing, so the pass was stopped there |
| Today, 23:10 UTC | the boundary clock alone | talos passes its 1,501 tests |
| 2026-11-15 23:31 UTC, a Sunday night | the preload and the boundary clock | 9 of 9 pass |
| 2026-12-31 23:31 UTC | the same | 9 of 9 pass |
| 2027-03-28 00:31 UTC, the day the clocks change | the same | 9 of 9 pass |

`grep -rnE "toISOString\(\)\.(slice|substring|split)|\.slice\(0, ?(10|ISO_DAY_LENGTH)\)"`
over the test and setup files of every app finds one other day cut from an
instant, in `apps/talos/test/dev-database.setup.ts`. It starts from the Paris
day, so it is right.
