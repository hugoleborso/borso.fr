---
date: 2026-11-23
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#395'
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/vite.config.ts, apps/pragma/site/src/lib/query-client.setup.ts]
time-to-detect: 15 minutes
tags: [pragma, tanstack-query, cache, offline, typescript]
zone: apps/pragma/site/src/lib/query-client.setup.ts
weak-point: prose-stands-in-for-a-check
recurs: none (PR #363 hit the same buster and its sweep wrote only a knowledge entry)
---

# A version string nobody remembers to bump

## User impact

No member saw it. Technical validation round 1 caught it before the merge.
The failing case was probed by the validator (measured, finding A12 of
`docs/features/pragma/flames-redesign/validation/technical-validation-2026-11-23-1329.md`).

| | Seen | Expected |
| --- | --- | --- |
| A member reloads within five minutes of the deploy, or opens the PWA offline within seven days, then taps the flame chip | `TypeError: Cannot read properties of undefined (reading 'map')`, and the sheet does not open | The streak sheet with the week |

## Causal chain

- Tapping the flame chip would throw instead of opening the sheet.
  - `StreakSheet` read `view.mine.week`, and the restored `streaks` answer had no `week`.
    - The persisted query cache restored the answer saved by the previous build, and counted it as fresh.
      - `PERSISTED_CACHE_SHAPE_VERSION` stayed `'2'` while `GET /api/streaks` gained `week`.
        - The buster was a string bumped by hand, tied to no type. The implementer changed the response through `@domain/practice-flame.core` and never opened `query-client.setup.ts`.

## Root cause of occurrence

*Thought a knowledge entry printed on the API's core files would remind whoever changes a response, actually a reminder still needs someone to act on it, and the response changed through a domain type the reminder did not name.*
**Method:** PR #363's sweep chose a level 5 reminder for a step a build can
do.

`docs/knowledge/a-pragma-response-shape-change-needs-the-cache-buster.md` said
"An added field is `undefined` in restored data until the refetch, so bump for
it too unless every reader accepts its absence." It triggered on
`apps/pragma/api/src/**/*.core.ts`, which PR #395 edited
(`api/src/streaks/streaks.core.ts`). Whether the hook printed it to the
implementer is unknown, because that transcript was not read. The field itself
came from `apps/pragma/domain/practice-flame.core.ts`, a path the entry did not
match.

The sweep of PR #363 saw the same buster miss and chose the entry. Its
inventory row 04 says: "Deriving the buster from the build would wipe every
member's cache at each deploy, which is a product call nobody asked for." The
operator made that call on 2026-11-23, after this sweep first shipped a script
that hashed the response types. He chose the persister's own lever over code
written for it.

## Detection failure causes

- **Typing:** the site reads every answer as `InferResponseType`, so the new field typechecked. Nothing typed the data restored from `localStorage`.
- **Tests:** `StreakSheet.test.tsx` renders the current shape only. No test can know which shape last week's build saved.
- **Knowledge hook:** a level 5 reminder. It failed on its second chance.

## Countermeasure

The fix in PR #395 bumped `'2'` to `'3'` (commit `79fc9da`). This sweep
removes the hand step.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the commit adding this file.

TanStack Query's persister drops the saved cache when `buster` changes. The
buster is now the commit the build came from, `GITHUB_SHA`, which every GitHub
Actions job sets and `vite.config.ts` already read for Sentry. A local build
uses `local`. A build can no longer restore an answer saved by another build,
so no response shape change can reach a member through the cache.

```diff
-const PERSISTED_CACHE_SHAPE_VERSION = '3';
 …
-  buster: PERSISTED_CACHE_SHAPE_VERSION,
+  buster: __BUILD_VERSION__,
```

```diff
+const buildVersion = readBuildSetting('GITHUB_SHA') ?? LOCAL_BUILD_VERSION;
 …
+  define: { __BUILD_VERSION__: JSON.stringify(buildVersion) },
```

The knowledge entry is deleted, because nothing is left to remember.

Cost. Every pragma deploy drops every member's saved cache, so the first open
after it loads from the network. Pragma deployed 84 times in the 30 days
up to 2026-11-23 (measured with `git log --first-parent -- apps/pragma`).
Before, the cache was dropped only on a hand bump, twice since the buster
was added in PR #247 (measured with `git log -G`).

Rejected. A script that hashed every GET response type through the TypeScript
7 compiler kept the cache across deploys that changed no shape. It took 137
lines, a fixture and a mutation suite, and the operator turned it down as cache
code written by hand. A source-file hash would bust on 32 of those 84 deploys,
where 2 changed a response.

**Proof it can fail:** `GITHUB_SHA=abc123 pnpm build` writes `buster:"abc123"`
into the bundle, and a build without it writes `buster:"local"`.

**Similar instances:** `grep -rn "buster" apps --include=*.ts` finds pragma's
only. The other apps persist no query cache.
