---
date: 2026-11-23
introduced-at: implementation
detected-at: qa
severity: medium
related-pr: '#389'
fix-commits: [a48054a0f, self]
eradication-level: 1
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
    - It ran `z.array(rosterPlayerSchema).safeParse` over the whole list, so one
      entry with an unknown enum value failed the whole array.
      - The code copied the blueprint `core-persisted-slice-parsed-not-trusted`,
        which "answers an empty slice for anything that does not match".

## Root cause of occurrence

*Thought a stored slice is valid or invalid as a whole, actually each entry of a
stored list ages on its own.* The blueprint's description in
`apps/banana-rush/site/src/lib/player-session.core.ts` said: "Parses the stored
text through a schema and answers an empty slice for anything that does not
match". For one record that is right. For a list or a map, one entry written
by an older build throws away every other entry. Banana Rush's own
`readSeats` had the same latent defect, for a map of seats by join code.

## Detection failure causes

- **Unit tests:** `roster.core.test.ts` covered a missing avatar, never an
  unknown part beside valid regulars.
- **Visual validation of PR #389:** its runs started from a clean storage, so
  no regular was ever written by an older build.

## Countermeasure

PR #400 reads each regular on its own (`a48054a0f`, `readRegular`), and a
regular whose pirate no longer parses keeps its name and mark and wears the
pirate of their table seat.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** `a48054a0f` for Skull King, and the commit adding this file for
the blueprint every new reader copies. Its description now says to parse one
entry at a time, and `readSeats` does so.

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

**Proof it can fail:** the new test `drops only the entry that no longer
matches` fails on the old `readSeats`, which answered `{}` for
`{ ABCD: seat, EFGH: { playerId: 42 } }`. Stryker kills all 11 mutants of the
new reader (measured).

**Similar instances:** `grep -rn "z.array(.*safeParse\|z.record(.*safeParse" apps/*/site/src`
finds no other stored list or map parsed as one block. Borsouvertures stores
one settings object, which the one-record rule fits.
