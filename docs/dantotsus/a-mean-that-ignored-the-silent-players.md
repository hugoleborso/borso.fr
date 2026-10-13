---
date: 2026-10-13
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#172'
fix-pr: none (opened with this entry; the number is not known when the file is written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/api/src/mastery/mastery.core.ts, apps/pragma/api/src/studies/concert-readiness.core.ts]
time-to-detect: hours
tags: [pragma, spec, testing]
zone: apps/pragma/api/src/mastery/mastery.core.ts
recurs: none (the first defect in a rule built on the mastery mean)
---

# A mean that ignored the silent players

## Symptom

On the Studies screen, *Afterglow* showed as **ready** for the next concert
after one member raised their own score to 7. Three other people play on that
song, and none of them had recorded anything. The readiness bar read *1 of 6
songs ready*, and that was the screenshot taken to check the feature.

## Root-cause chain

1. **Why was the song ready?** The readiness rule called `meanForSong` and
   compared the result with 7.
2. **Why was the mean 7?** `meanForSong` skipped every member and instrument
   with no score, so it averaged one score.
3. **Why did skipping look right?** Skipping is what "the average of what we
   know" needs, and the catalogue badge on the site makes the same choice.
   The function had no caller before this feature, and its name said *for the
   song*, not *of the scores recorded*, so it read as the song's mastery.
4. **Why did the spec and the plan not catch it?** The spec said "the lineup
   mean (`meanForSong`)", naming the function instead of saying what a ready
   song is. The plan copied that, and the unit tests checked a mean of exactly
   7, which passed.

**Root cause:** thought the lineup mean answers "can the band play this
song"; actually it answers "how good are the people who answered", and a band
is not ready while some of its players have said nothing.

## Detection failure causes

- **Typing:** a mean is a number either way; nothing types "everyone
  answered".
- **CI (tests / build):** every readiness test gave every lineup member a
  score, because the fixtures were written from the same reading of the rule.
- **Functional validation locally:** caught it. The implementer looked at the
  screenshot of the seeded data, where most players had no score, and the
  number was obviously wrong.

## Countermeasure

- **Code:** in PR #172, `isSongReady` stopped calling `meanForSong` and
  requires a score for every member and instrument of each lineup before it
  compares the mean with 7; a test holds four players, three at 10 and one
  silent, as not ready.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** the commit adding this file.

**The actual fix:** `meanForSong` had no caller left outside its own test once
readiness stopped using it. It is deleted, so the next rule that needs a
lineup's mastery cannot reach for the version that skips silent players. The
two remaining callers of a mastery summary each say what they mean:
`isLineupReady` in `concert-readiness.core.ts`, and the site's
`meanDefaultMasteryForSong` for the catalogue badge.

```diff
-export function meanForSong(
-  defaults: DefaultMap,
-  overrides: OverrideMap,
-  songId: SongId,
-  lineup: Lineup,
-): number | null {
-  ...
-    if (score === null) continue;
```

**Sibling defects swept:** `meanDefaultMasteryForSong` on the site skips
unscored players in the same way, and is left as it is: it labels the
catalogue badge, which shows the average of what is known, not a verdict.

## See also

- [`apps/pragma/VOCABULARY.md`](../../apps/pragma/VOCABULARY.md), *Concert
  readiness*, which now states the rule instead of naming a function.
