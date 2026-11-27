---
date: 2026-08-15
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#52'
fix-commits: [2b6c6bc5a2, 6765875f6]
eradication-level: 4
eradication-paths: [apps/pragma/api/src/songs/search-ranking.core.test.ts, apps/pragma/api/src/songs/__fixtures__/deezer-valerie.json]
time-to-detect: minutes
tags: [testing, mutation, fixture, musicbrainz, pragma, validation]
zone: apps/pragma/api/src/songs/search-ranking.core.ts
recurs: none (first entry on a ranking rule designed from fixture shapes rather than real queries)
---

# A hundred per cent coverage, no surviving mutants, and the ranking was wrong

## User impact

A pragma member searching the catalogue for a song to add would have seen
covers named after the artist above the song. Measured against live
MusicBrainz responses during PR #52, before the design shipped:

| | Seen | Expected |
| --- | --- | --- |
| Search `Valerie Amy Winehouse` | first three results: tracks titled *Amy Winehouse* | Amy Winehouse's *Valerie* first |

The design had 100 % statement, branch, function and line coverage and a
mutation score of 100 with zero survivors.

## Causal chain

- Tracks titled *Amy Winehouse* ranked first for `Valerie Amy Winehouse`.
  - Each scored the flat exact-title bonus.
    - The first design rewarded a hit whose title the query contains:

      ```ts
      matchesTitleExactly(hit, query)   // query.includes(hit.title) ← the faulty line
      ```

      A two-word artist name inside the query satisfies it as readily as a song title.
      - The rule was designed in the PR #52 session from one example query, the operator's report "Beggin Maneskin", and from hand-written hits of the shape `{ title: 'Beggin', artist: 'Maneskin', … }`. In that input every title is a song name and every artist a person (Material, inferred: the session had no set of real queries or payloads before it ran live ones).

## Root cause of occurrence

*Thought a query that contains a hit's title names that song, actually a
query mixes title words and artist words, and an artist's name is also the
title of other tracks.* **Material (inferred):** the input held one query and
fixtures shaped like the function, none with a title that is somebody's name,
so the design and its tests were both built from the same blind spot.

Commit `a76962211` records the measurement that disproved it: "Measured
against live MusicBrainz responses, the first hit becomes the original for
Beggin' (Måneskin), Uprising (Muse), Valerie (Amy…" (read this session).

## Detection failure causes

- **Typing:** the wrong design type-checked. Both designs take a hit and a query and return a number.
- **Linter:** no rule tells a defensible scoring rule from a wrong one.
- **Unit tests and coverage:** every fixture was written from the shape the function expects, so the tests reached every branch of the wrong rule.
- **Mutation testing:** Stryker asks whether the tests notice the code changing. They did. A mutant of a wrong rule is still killed by tests written for it, so the score was 100.
- **CI:** both gates measure the tests against the code they were written from, so CI would have gone green.
- **Local validation:** this caught it. Running the ranker against live MusicBrainz responses showed the wrong order at once.

## Countermeasure

Word-level overlap on title and artist replaced the flat exact-title bonus,
and title words the query never asked for now cost points, which separates
`Valerie` from `Since I Left Valerie (Amy Winehouse vs. The Avalanches)`.
Shipped in PR #52 (`apps/pragma/api/src/songs/search-ranking.core.ts`).

## Eradication

**Type:** detection (level 4)

**Reference:** [PR #53](https://github.com/hugoleborso/borso.fr/pull/53),
commit [`2b6c6bc`](https://github.com/hugoleborso/borso.fr/commit/2b6c6bc5a2be080478dbefa39dd35cf95a152cb0)
committed the verbatim MusicBrainz `dismax` response for
`Valerie Amy Winehouse` and ran the real mapper and ranker over it. Commit
`6765875f6` (2026-09-15) replaced MusicBrainz with Deezer and replaced that
fixture with the real Deezer response,
`apps/pragma/api/src/songs/__fixtures__/deezer-valerie.json`. The MusicBrainz
fixture no longer exists.

What holds today (`search-ranking.core.test.ts:215-240`, read this session):

```ts
it('is handed a response that mixes the original with tributes and a television cast', () => {
  const artists = mapDeezerTracks(FIXTURE).map((entry) => entry.artist);
  expect(artists).toContain('Mark Ronson');
  expect(artists).toContain('Glee Cast');
});

it('keeps the studio original first, which is credited to Mark Ronson', () => {
  const ranked = rankExternalHits(mapDeezerTracks(FIXTURE), QUERY);
  expect(ranked[0]?.artist).toBe('Mark Ronson');
```

The first assertion gives the fixture its teeth. It pins that the real
response mixes the original with covers, so the fixture cannot rot into one
that passes trivially. Level 1 is out of reach: no type can express "this
scoring rule matches how people search", so the reachable mechanism is to make
real data part of the gate.

**Proof it can fail:** the replaced design is the planted defect. Against the
real payload, the exact-title bonus put tracks titled *Amy Winehouse* first,
which fails "keeps the studio original first" (measured in PR #52 against the
live response, not replanted this session).

**Similar instances:** `find apps -type d -name __fixtures__` finds real
payloads only under `apps/pragma/api/src/songs/`. `grep -rlni "rank\|score"
apps/*/api/src --include=*.core.ts` lists 21 files. By their names, most
score the app's own records (game scores, lap rankings, mastery). Two rank
free text a person typed and could carry the same blind spot:
`apps/talos/api/src/memory/memory-search.core.ts` and
`apps/talos/api/src/memory/memory-context.core.ts` (inferred from the names,
not read this session).
