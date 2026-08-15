---
date: 2026-08-15
introduced-at: conception
detected-at: gate
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/49
fix-pr: https://github.com/hugoleborso/borso.fr/pull/49
fix-commits: []
eradication-level: 1
time-to-detect: hours
tags: [architecture-map, tooling, generated-files, git]
---

# A generated file cannot contain its own commit, so a byte gate on it failed the commit after the one that moved it

## Symptom

Editing a document under `docs/standards/` and committing it succeeded. The
**next** commit then failed:

```
[pre-commit] checking the architecture pages
  docs/architecture/pragma-architecture.html is out of date.
  Run `pnpm exec tsx scripts/architecture/architecture-graph.ts`.
```

The failure names an application whose code nobody touched, on a commit that
touched neither `apps/` nor the generator. Regenerating fixes it, and the next
standards edit brings it straight back.

## Root-cause chain

1. The architecture page carries a Standards tab with a commit-by-commit diff
   viewer, so each document ships with its whole history: sha, date, subject and
   the file's text at every commit.
2. That history comes from `git log`, which is the one input to the page that is
   not the working tree.
3. A pre-commit hook runs before the commit exists, so the generator reads
   history up to `HEAD`, the *parent* of the commit being made. The page written
   into commit N therefore contains history up to N−1, and `--check` passes.
4. Commit N lands. `git log` now returns N.
5. At commit N+1 the generator produces a page containing N, the committed page
   stops at N−1, the bytes differ, and the gate fails.
6. Regenerating at N+1 produces history up to N, which is correct until the next
   standards edit repeats the whole cycle.

The general form: **a file cannot contain the sha of the commit that adds it.**
Any artefact embedding its own history is one commit behind by construction, and
a byte gate over it is asking a question with no true answer.

## Detection failure causes

- **The gate was right about the bytes and wrong about the question.** Its
  purpose is "the map matches the code"; it was comparing bytes that do not
  describe code at all.
- **The failure surfaced one commit late and pointed at the wrong file.** It
  named `pragma-architecture.html` on a commit touching `docs/standards/`, so
  the natural first read is a generator bug or a stale checkout.
- **The workaround always worked.** Running the generator cleared it every time,
  which is exactly what makes a recurring cost invisible: each instance is
  thirty seconds, and nothing accumulates a signal.
- **It was rare enough to look like noise.** Standards documents change rarely
  outside a branch like this one, which edited seven of them.

## Countermeasure

Fence the git-derived bytes and compare around them.

| | Before | After |
| --- | --- | --- |
| Version count | rendered into each button's HTML | rendered by the client from the payload, so the volatile bytes are one region rather than two |
| History payload | a bare `<script type="application/json">` | the same script, between `<!--history-->` and `<!--/history-->` |
| `--check` on the model | byte-for-byte | byte-for-byte, unchanged — every byte of it comes from the tree |
| `--check` on the page | byte-for-byte | byte-for-byte with the fenced region removed from both sides |

`withoutHistory()` in `architecture-page.ts` does the removal, and the checker
imports the same function that renders the fence, so the two cannot disagree
about where it is.

## Eradication

**Structural, level 1.** The gate can no longer ask a question whose answer
depends on when it ran. Everything outside the fence is a pure function of the
working tree, so it is still compared to the byte; the region inside is the only
thing that moves on its own, and it is skipped.

Verified three ways on `pragma`, at the commit that introduced the fence:

| Scenario | Expected | Result |
| --- | --- | --- |
| A commit edits a standard, then `--check` runs without regenerating | passes | passes — raw bytes differ, and the difference is entirely inside the fence |
| A `*.utils.ts` gains an export, no regeneration | fails | fails, on `borso-fr-architecture.json` |
| The renderer changes a label, no regeneration | fails | fails, on `pragma-architecture.html` |

The second and third are the two ways the map can really go stale — the code
moved, or the view of it moved — and both still stop a commit.

**What this deliberately accepts:** the Standards tab is up to one commit behind
its own history, and no gate will say so. That is not a weakening, it is the
truth being stated once instead of being discovered every time: the newest entry
appears on the next run of the generator, which any commit touching `apps/` or
the generator already performs.

## The general shape

A byte gate over a generated file is only honest when every input to that file
is in the tree being committed. The moment one input is `git log`, the wall
clock, a network response or an environment variable, the gate stops asking "is
this derived from the code" and starts asking "was this generated at this exact
moment", which nothing can satisfy twice. Fence the volatile input, or move it
out of the gated artefact — but do not let a gate keep asking.
