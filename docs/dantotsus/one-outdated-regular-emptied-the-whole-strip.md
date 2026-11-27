---
date: 2026-11-23
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#389'
fix-commits: [a48054a0f, c122c579d]
eradication-level: 5
eradication-paths: [apps/skull-king/site/src/lib/roster.core.ts, apps/banana-rush/site/src/lib/player-session.core.ts]
time-to-detect: 1 hour after the merge
tags: [skull-king, frontend, validation, visual-validation]
zone: apps/skull-king/site/src/lib/roster.core.ts
recurs: none (no earlier entry covers a stored list read as one block)
---

# One outdated regular emptied the whole strip

## User impact

PR #389 shipped Skull King's pirates to prod. The visual validation of PR #400
found the defect on its first run (`visual-validation-2026-11-23-2015.md`,
row 12), about an hour after that merge.

| | Seen | Expected |
| --- | --- | --- |
| One stored regular holds a hair this version no longer offers | All 8 regulars vanish from the home screen; storage still holds 8 | 7 regulars as before, and the 8th wearing the pirate of the seat they take |

## Causal chain

- The regulars strip on the home screen is empty.
  - `readRegulars` answered `[]`.
    - It parsed the whole stored list in one call, so one entry with an
      unknown enum value failed the whole array. Commit `ba0557404` (PR #389)
      wrote it:

      ```ts
      // @FollowsBlueprint core-persisted-slice-parsed-not-trusted
      const regulars = z.array(rosterPlayerSchema).safeParse(stored);
      return (regulars.data ?? []).map(…);   ← ❌ one bad entry, no regulars
      ```

      - The agent copied the blueprint it names. At `ba0557404^`, its
        description in `apps/banana-rush/site/src/lib/player-session.core.ts`
        said it "answers an empty slice for anything that does not match", and
        its own `readSeats` parsed a map of seats the same way (Machine).

## Root cause of occurrence

*Thought a stored slice is valid or invalid as a whole, actually each entry of
a stored list ages on its own.* (Machine)

The canonical example said so. `git show ba0557404^:apps/banana-rush/site/src/lib/player-session.core.ts`,
line 13: "Parses the stored text through a schema and answers an empty slice
for anything that does not match". For one record that is right. For a list or
a map, one entry written by an older build throws away every other entry. The
agent followed the blueprint it was given, so the cause is the example, not
the agent.

## Detection failure causes

- **Unit tests:** `roster.core.test.ts` covered a missing avatar, never an
  unknown part beside valid regulars. The blueprint's own test never planted an
  outdated entry either.
- **Visual validation of PR #389:** its runs started from a clean storage, so
  no regular was ever written by an older build.

## Countermeasure

PR #400 reads each regular on its own (`a48054a0f`, `readRegular`). A regular
whose pirate no longer parses keeps its name and mark and wears the pirate of
their table seat.

## Eradication

**Type:** knowledge (level 5). The blueprint's description is the only thing
every new reader meets, and nothing refuses a reader that ignores it.

**Reference:** `a48054a0f` fixed Skull King. Commit `c122c579d` rewrote the
blueprint's description to parse "one entry at a time", and fixed `readSeats`
the same way:

```diff
-    const storedSeats: unknown = JSON.parse(String(rawValue));
-    const seats = seatsSchema.safeParse(storedSeats);
-    return seats.success ? seats.data : {};
+    const storedSeats = storedSeatsSchema.parse(JSON.parse(String(rawValue)));
+    return Object.fromEntries(
+      Object.entries(storedSeats).flatMap(([joinCode, entry]) => {
+        const seat = seatSchema.safeParse(entry);
+        return seat.success ? [[joinCode, seat.data]] : [];
+      }),
+    );
```

The first version of this entry called this level 1. Two fixed readers and a
reworded description do not stop the next `z.array(schema).safeParse` on a
stored value.

**Proof it can fail:** the test `drops only the entry that no longer matches`
fails on the old `readSeats`, which answered `{}` for
`{ ABCD: seat, EFGH: { playerId: 42 } }`. Stryker kills all 11 mutants of the
new reader (measured by the first version of this entry).

**Proposed:** hold the property at the storage boundary, not at the zod call.
A rule matching inline `z.array(…).safeParse` would have missed both instances
this entry found: the old `readSeats` called a named `seatsSchema.safeParse`,
and the borsouvertures reader uses hand-written predicates with no zod call.
Instead, give each app one storage adapter, `readStoredCollection(key,
entrySchema)`, that parses a stored list or map entry by entry and a stored
record field by field, and make it the only module that touches
`localStorage`. The fixed readers reach it through `window.localStorage` and a
local `storage.getItem`, so the rule must match the global, not the method. A
rule under `eslint-rules/` then refuses `localStorage` anywhere else. Today
only `eslint-rules/impurity.js` mentions it. Fix the borsouvertures reader in
the same change, because it is a live defect. A stored value could then not be
read without passing through the per-entry parser.

**Similar instances:** `grep -rln 'localStorage' apps/*/site/src | grep -v test`
lists nineteen files that touch storage, whatever parser they use, i18n setup
included (measured 2026-11-27). The parsers behind them were not all read. One of them shows the
same class in a record.
`apps/borsouvertures/site/src/state/persistedState.utils.ts`
(`unknown-payload-parser`) answers `null` for the whole settings record when
one field, such as a `boardStyle` a later build removed, no longer parses. The
reader then loses its side and its cards per day with it. That reader is not
fixed.
