---
date: 2026-09-16
introduced-at: self-validation
detected-at: qa
severity: medium
related-pr: '#100'
fix-pr: '#102'
fix-commits: []
eradication-level: 2
time-to-detect: minutes
tags: [pragma, testing, process, harness, gates]
---

# The seed said one compo, the checklist said another, and the screen was right all along

## Symptom

The visual validator returned **FAIL** on two of twenty rows:

> **11 — compo badge names the wrong compo.** "Réécrire le pont" shows the
> badge **"Last Call"**, not "Runaway Sun". The renderer is correct against
> the data: `GET /api/tasks` gives that task `songId=77eea4e2…`, which
> `GET /api/songs` names Last Call.

The screen was right. The data was right. The *checklist* was wrong, and it
was wrong because the person who wrote it — this session — also wrote the
script that seeded the data, and the two disagreed with each other.

A validation round was spent proving that a correct renderer renders
correctly.

## Root-cause chain

1. **Why did the checklist name the wrong composition?**
   It was written from the seeding script, which took `songs[0]` from
   `GET /api/songs` and called it *Runaway Sun*.
2. **Why was `songs[0]` not Runaway Sun?**
   The catalogue comes back newest first (`listSongsNewestFirst`), so index 0
   is the song created *last*. Of the two originals in the fixture, that is
   Last Call.
3. **Why was that not obvious?**
   Because the ordering is documented — `VOCABULARY.md` says "the catalogue
   is listed newest first by `createdAt`" — and an index into an array reads
   like "the first one" regardless of what the array is sorted by. The
   documented fact and the code that ignores it can sit in the same session
   without ever meeting.
4. **Why was there a hand-rolled seeding script at all?**
   Because the committed preview fixture seeds instruments, members, songs, a
   setlist and a transition comment, and no tasks. The two new screens had
   nothing to show on a fresh database, so the brief needed data, so the data
   got written in a shell heredoc that nobody would review.
5. **Why is a throwaway script worse than a fixture?**
   Not because it is throwaway. Because nothing checks it. The committed
   fixture has a test file asserting that every lineup names a member the
   fixture declares and every chart opens on its own title; the heredoc had
   no such thing, and its one claim about the data was the claim that was
   false.

**Root cause:** thought the risk in a validation brief was the assertions
about the screen, actually the risk was the assertion about the *data*, which
was taken from an index into a list sorted the other way and checked by
nothing.

## Detection failure causes

- **Typing:** `songs[0]` is a `Song`. Every song is.
- **Linter / static analysis:** the script was a heredoc piped to `python3`,
  outside every gate in the repository.
- **Functional validation locally:** the screens rendered the data correctly,
  which is what made the disagreement look like a screen defect.
- **CI:** the seed data never reached CI.
- **Code review:** the brief was written and read by the same session inside
  one turn.
- **PO / QA validation:** this *is* the QA layer. It caught the disagreement
  and could not tell which side was wrong without querying the API itself,
  which it did — that part worked.

## Countermeasure

The task board a preview opens on is now part of the committed fixture, and a
task names its member and its composition **by name**.

- **Code:** `SEED_TASKS` in `apps/pragma/api/src/__test/test-seed-fixture.core.ts`,
  seeded by `seedTasks` in `test-seed.service.ts`.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — devx check), on top of a code diff that
removes the need for the hand-rolled script

**Reference:** PR #102 · commits on this branch adding `SEED_TASKS`, its
seeding and its tests

**The actual fix:**

```diff
+  it('points only at compositions, by title, and only at songs the fixture declares', () => {
+    const originalTitles = new Set(
+      SEED_SONGS.filter((song) => song.origin === 'original').map((song) => song.title),
+    );
+    for (const task of SEED_TASKS) {
+      if (task.songTitle === null) continue;
+      expect(originalTitles).toContain(task.songTitle);
+    }
+  });
```

The fixture is a `.core.ts`, so it is gated at 100% coverage and mutation
score, and its sibling test now holds six assertions about the board: that
every assignee is a member the fixture declares, that every linked song is a
composition it declares, that one task is unclaimed, that one member owes
nothing, that one open task is late and one done task is late, and that all
three statuses appear. A fixture that fails any of those fails the commit.

The indexing mistake is now unavailable rather than merely tested: a seed row
carries `assigneeFirstName` and `songTitle`, and `seedTasks` resolves them
through maps built from the fixture's own names. There is no position to get
backwards.

**Sibling defects swept:** the same `songIdByTitle` map replaced the
positional lookup nowhere else — `seedConcertSetlist` and
`seedTransitionComment` index `songIds` deliberately, against the array they
were just handed in the same function, which is a position with a meaning
rather than a guess about an order.

## See also

- [`docs/knowledge/a-pragma-preview-cannot-be-signed-into.md`](../knowledge/a-pragma-preview-cannot-be-signed-into.md)
  — the other reason the preview fixture exists, and why anything a reviewer
  needs on a fresh preview has to be in it.
- [`the-hooks-that-refused-a-call-and-forgot-it.md`](./the-hooks-that-refused-a-call-and-forgot-it.md)
  — the other half of this PR's lesson: the validator logged this friction to
  `KAIZEN.md` because its prompt told it to, which is the only reason this
  entry exists.
