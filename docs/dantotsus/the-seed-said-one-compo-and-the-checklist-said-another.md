---
date: 2026-09-16
introduced-at: self-validation
detected-at: qa
severity: medium
related-pr: '#100'
fix-commits: [948204d50a]
eradication-level: 2
eradication-paths: [apps/pragma/api/src/__test/test-seed.service.ts, apps/pragma/api/src/__test/test-seed-task-board.core.ts, apps/pragma/api/src/__test/test-seed-task-board.core.test.ts]
time-to-detect: minutes
tags: [pragma, testing, process, harness, gates]
zone: apps/pragma/api/src/__test
---

# The seed said one compo, the checklist said another, and the screen was right all along

## User impact

The operator paid for a validation round that proved a correct screen correct. The visual validator of PR #100 returned FAIL on two of twenty rows. The screen and the data were both right. The checklist was wrong.

| | Seen | Expected |
| --- | --- | --- |
| Row 11 of the validation checklist | Task "Réécrire le pont" should show the badge "Runaway Sun" | The checklist names the composition the seed linked, "Last Call" |

The validator's finding:

> **11 — compo badge names the wrong compo.** "Réécrire le pont" shows the
> badge **"Last Call"**, not "Runaway Sun". The renderer is correct against
> the data: `GET /api/tasks` gives that task `songId=77eea4e2…`, which
> `GET /api/songs` names Last Call.

## Causal chain

- The validator failed row 11 against a correct screen.
  - The checklist said the task was linked to "Runaway Sun". The seed had linked it to "Last Call".
    - The session wrote the checklist from its own seeding script, which took the first song of `GET /api/songs` and called it Runaway Sun.

      ```python
      # heredoc piped to python3 by the session that wrote the brief, never committed
      runaway_sun = songs[0]  # ❌ the newest song, not the first one seeded
      ```

      - `GET /api/songs` returns the catalogue newest first (`listSongsNewestFirst` in `apps/pragma/api/src/songs/songs.repository.ts`). Of the fixture's two originals, the newest is Last Call.
        - The session seeded tasks with a throwaway heredoc against the live API, because the committed preview fixture seeded instruments, members, songs, a setlist and a transition comment, and no tasks. The data it worked from was a list in an order it could not see. (Material)

## Root cause of occurrence

*Thought `songs[0]` is the first song the fixture seeded, actually `GET /api/songs` lists the catalogue newest first, so index 0 is the last one created.*

Material, inferred. The order was written in `apps/pragma/VOCABULARY.md` at the time ("The catalogue is listed newest first by `createdAt`", line 472 at `948204d50^`). A one-off seeding script gives no reason to load the vocabulary, and the API response carries no hint of its order. The transcript was not read for this rewrite, so whether the file was in context is inferred. The committed fixture, the input a brief writer should seed from, held no tasks, which is what sent the session to a positional lookup in the first place.

## Detection failure causes

- **Typing:** `songs[0]` is a song. Every song is.
- **Linter / static analysis:** the script was a heredoc piped to `python3`, outside every gate in the repository.
- **Tests:** the committed fixture has a test file asserting that every lineup names a member the fixture declares. The heredoc had none, and its one claim about the data was the false one.
- **Code review:** the brief was written and read by the same session inside one turn.
- **QA (caught it):** the validator saw the disagreement, and queried the API itself to tell which side was wrong.

## Countermeasure

The task board a preview opens on became part of the committed fixture, and a task names its member and its composition by name. `seedTasks` in `apps/pragma/api/src/__test/test-seed.service.ts` resolves each `songTitle` through a `songIdByTitle` map built from the fixture's own names.

## Eradication

**Type:** DevX check (level 2), on top of a seed that removes the position.

**Reference:** commit [`948204d5`](https://github.com/hugoleborso/borso.fr/commit/948204d50a). `SEED_TASKS` now lives in `apps/pragma/api/src/__test/test-seed-task-board.core.ts`.

```ts
// apps/pragma/api/src/__test/test-seed.service.ts
songId: seed.songTitle === null ? null : (songIdByTitle.get(seed.songTitle) ?? null),
```

```ts
// apps/pragma/api/src/__test/test-seed-task-board.core.test.ts
it('points only at compositions, by title, and only at songs the fixture declares', () => {
  const originalTitles = new Set(
    SEED_SONGS.filter((song) => song.origin === 'original').map((song) => song.title),
  );
  for (const task of SEED_TASKS) {
    if (task.songTitle === null) continue;
    expect(originalTitles).toContain(task.songTitle);
  }
});
```

A seed row carries `assigneeFirstName` and `songTitle`, so there is no position to get backwards. The task board is a `.core.ts`, gated at 100% coverage and mutation score, and its sibling test checks every assignee and linked song against the fixture, plus the board's shape (an unclaimed task, late tasks, all three statuses). A brief writer now reads the board from the fixture instead of seeding it by hand.

The level is 2, not 1. A title that names no song resolves to `null` at seed time, and only the test refuses it.

**Proof it can fail:** inferred, not replayed this session. A `SEED_TASKS` row whose `songTitle` names a cover, or a title the fixture does not declare, fails "points only at compositions, by title".

**Similar instances:** `seedConcertSetlist` and `seedTransitionComment` index `songIds` against the array they were just handed in the same function, a position with a meaning rather than a guess about an order. `apps/pragma/api/src/__test/test-seed-edge-cases.service.ts` resolves songs by title through the same kind of map. [`../knowledge/a-pragma-preview-cannot-be-signed-into.md`](../knowledge/a-pragma-preview-cannot-be-signed-into.md) says why anything a reviewer needs on a fresh preview has to be in the fixture.
