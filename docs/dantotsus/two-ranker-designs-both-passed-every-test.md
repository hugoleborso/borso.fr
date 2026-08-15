---
date: 2026-08-15
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#52'
fix-pr: '#53'
fix-commits: [2b6c6bc]
eradication-level: 4
time-to-detect: minutes
tags: [testing, mutation, fixture, musicbrainz, pragma, validation]
---

# A hundred per cent coverage, no surviving mutants, and the ranking was wrong

## Symptom

The first scoring design for the catalogue's MusicBrainz search gave a flat
bonus when the query contained the hit's exact title. Searching
`Valerie Amy Winehouse` then returned, in order, three tracks literally
**titled** *Amy Winehouse* — because the query contains that string, so each of
them scored the exact-title bonus.

The design had full statement, branch, function and line coverage, and a
mutation score of 100 with zero survivors.

## Root-cause chain

1. **Why did tracks titled *Amy Winehouse* rank first?**
   Because `matchesTitleExactly(hit, query)` asked whether the query *contains*
   the hit's title, which a two-word artist name satisfies as readily as a
   song title.

2. **Why did the tests not catch it?**
   Because every fixture was hand-written from the shape the function expects.
   A hit was `{ title: 'Beggin', artist: 'Maneskin', … }`; no fixture had a
   *title* that was somebody's *name*, because nobody writing a test thinks to
   invent one.

3. **Why did mutation testing not catch it?**
   Because Stryker asks whether the tests notice the code changing. They did.
   It cannot ask whether the code is answering the right question — a mutant of
   a wrong rule is still wrong, and the tests kill it just as reliably.

4. **Why was the gap invisible?**
   Because both gates measure the tests against the code, and the code against
   itself. Neither reaches outside for the data the function exists to handle.

**Root cause:** thought *full coverage plus zero surviving mutants means the
function is right*, actually *both gates measure the tests against the code
they were written from, so a design that is wrong about the world passes them
exactly as well as one that is right*.

## Detection failure causes

- **Typing:** the wrong design type-checked; both take a hit and a query and
  return a number.
- **Linter:** no rule distinguishes a defensible scoring rule from an
  indefensible one.
- **Functional validation locally:** this is the layer that caught it. Running
  the ranker against live MusicBrainz responses, rather than fixtures, showed
  the wrong order immediately.
- **CI:** would have gone green. Coverage and mutation were both at 100 on the
  wrong design.
- **Code review:** the rule reads plausibly in isolation. "Reward a hit whose
  title the query names" is a sentence a reviewer nods at.

## Countermeasure

Word-level overlap on title and artist replaced the flat exact-title bonus, and
title words the query never asked for now cost points — which is what separates
`Valerie` from `Since I Left Valerie (Amy Winehouse vs. The Avalanches)`.

- **Code:** shipped in PR #52, `apps/pragma/api/src/songs/search-ranking.core.ts`.

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — a test over a real payload the unit fixtures
could not have imagined)

**Reference:** [PR #53](https://github.com/hugoleborso/borso.fr/pull/53) · commit [`2b6c6bc`](https://github.com/hugoleborso/borso.fr/commit/2b6c6bc5a2be080478dbefa39dd35cf95a152cb0)

**The actual fix:** the verbatim response `dismax` returns for
`Valerie Amy Winehouse` is committed as
`apps/pragma/api/src/songs/__fixtures__/musicbrainz-valerie-dismax.json`, and
three assertions in `search-ranking.core.test.ts` run the real mapper and the
real ranker over it.

```ts
it('is handed a response whose first hits are covers, not the original', () => {
  const hits = mapMusicBrainzRecordings(FIXTURE);
  expect(hits[0]?.artist).not.toBe('Amy Winehouse');
  expect(hits.findIndex((entry) => entry.artist === 'Amy Winehouse')).toBeGreaterThan(0);
});

it('promotes the Amy Winehouse recording to the first result', () => {
  const ranked = rankExternalHits(mapMusicBrainzRecordings(FIXTURE), QUERY);
  expect(ranked[0]?.artist).toBe('Amy Winehouse');
});
```

The first assertion is the one that gives the fixture its teeth: it pins that
the upstream response really does put covers first, so the fixture cannot rot
into a trivially-passing one without the test saying so.

What makes this payload worth committing is that the studio recording sits
sixth with **one release, no ISRC and no tag** — every notability signal reads
zero. Nothing in the scoring's popularity proxies promotes it; only the word
overlap and the unasked-word penalty do. A synthetic fixture would have given
the original a healthy release count, and the test would have passed for the
wrong reason.

This is a level 4 rather than a level 1 because no type can express "this
scoring rule matches how people search". The reachable eradication is to make
the real data part of the gate.

## Related

- [`docs/standards/10-testing.md`](../standards/10-testing.md) — the coverage
  and mutation gates, and what they are each for.
- [`docs/dantotsus/lectured-without-reading-the-code.md`](./lectured-without-reading-the-code.md)
  — the same family: confidence sourced from a plausible internal story rather
  than from the artefact.
