---
date: 2026-11-23
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#395'
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/scripts/cache-shape/response-shape.adapter.ts, apps/pragma/vite.config.ts, apps/pragma/site/src/lib/query-client.setup.ts]
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
member's cache at each deploy, which is a product call nobody asked for." That
held for a buster derived from source files. It does not hold for one derived
from the response types.

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

`readResponseShapeFingerprint` opens pragma's TypeScript project through
`typescript/unstable/sync`, the TypeScript 7 compiler API already installed.
It walks every `$get` of the Hono client `api`, writes out each JSON body
structurally (fields, optional marks, unions, arrays, scalars), sorts the
lines and hashes them. Vite injects the hash as `__PERSISTED_CACHE_SHAPE__`,
and the query client uses it as its `buster`. A response shape change now
changes the buster in the same build. Any other change leaves it, and the
members' saved data with it.

```diff
-const PERSISTED_CACHE_SHAPE_VERSION = '3';
 …
-  buster: PERSISTED_CACHE_SHAPE_VERSION,
+  buster: __PERSISTED_CACHE_SHAPE__,
```

```diff
 export default defineConfig({
   root: fromHere('./site'),
+  define: {
+    __PERSISTED_CACHE_SHAPE__: JSON.stringify(readResponseShapeFingerprint(fromHere('.'))),
+  },
```

The knowledge entry is deleted, because nothing is left to remember.

Costs, measured here. The walk covers 96 response bodies in about 2.5 s, once
per `vite` start and once per `vite build`. A full `pnpm build` of pragma took
7.41 s with it. The first deploy of this change drops every member's saved
cache once, because the hash replaces `'3'`. It leans on an API TypeScript
labels unstable, so a TypeScript bump can break the build. That failure is
loud, in CI.

Rejected alternatives. A hash of the API and domain source files would bust on
32 of the 84 pragma merges of the last 30 days, where 2 changed a response
(measured with `git log --first-parent` since 2026-10-24), so members would
lose their saved data about once a day. A CI gate on those paths would flag the
same 32. No library derives a cache key from TypeScript types, since types do
not exist at run time.

**Proof it can fail:** with the four files PR #395 changed put back to their
state before the merge, the fingerprint reads `c9fd50b09064`. With them
restored it reads `cc0ea6773ce5`. Two runs on the same tree give the same
hash, which `response-shape.adapter.test.ts` holds.

**Similar instances:** `grep -rn "buster" apps --include=*.ts` finds pragma's
only. The other apps persist no query cache.
