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

## Countermeasure

**Stop committing the pages.** `.gitignore` covers `docs/architecture/*.html`;
the model beside each page stays committed and stays gated to the byte, because
every byte of it comes from the working tree.

Nothing was reading the committed bytes. Both consumers already rebuilt from
source before using them:

| Consumer | What it does | Needed the commit? |
| --- | --- | --- |
| `pages.yml` | regenerates, then publishes to GitHub Pages | no — its own comment said "a page published from a stale file is impossible" |
| `architecture.yml` | regenerates the head model, then diffs it against a worktree of the merge base | no |
| `--check` | compared the committed page against a fresh one | only because the page was committed |

So the gate's only subject was its own output. Removing the file removed the
gate, the staleness, and 9.3 MB that was rewritten in full on every change.

`.gitignore` already carried the same rule for the per-pull-request diff pages,
with the same reason written next to it. The maps should have joined them.

## Eradication

**Structural, level 1.** The failure cannot recur, because the artefact it was
about no longer exists in the tree. There is no committed page to fall behind,
and a reader always opens one built from the current code.

Verified after the change:

| Scenario | Expected | Result |
| --- | --- | --- |
| A commit edits a standard, then `--check` runs without regenerating | passes | passes |
| A `*.utils.ts` gains an export, no regeneration | fails | fails, on `borso-fr-architecture.json` |

**A first attempt that was the wrong altitude, kept here because the reasoning
is the lesson.** The first fix fenced the git-derived bytes between
`<!--history-->` and `<!--/history-->` and taught `--check` to compare the page
with that region removed. It worked, and it was verified three ways. But it
spent a page-renderer change, a client-side rewrite of the version counts and a
comparison special case to preserve a file that nothing read. *Making a gate
tolerate a useless artefact is worse than deleting the artefact.* The question
"why is this committed at all" arrives before "how do I compare it", and asking
it in that order would have skipped the fence entirely.

**What this deliberately accepts:** a fresh clone cannot open the map without
running the generator, and GitHub's file view no longer serves it. Neither is a
loss in practice — a 4.5 MB HTML blob was never readable in that view, the
published Pages site is the address people use, and every pull request carries
its own maps as a workflow artifact.

## The general shape

A byte gate over a generated file is only honest when every input to that file
is in the tree being committed. The moment one input is `git log`, the wall
clock, a network response or an environment variable, the gate stops asking "is
this derived from the code" and starts asking "was this generated at this exact
moment", which nothing can satisfy twice.

The second question to ask, and the one that resolves it faster: **who reads the
committed copy?** A generated artefact that every consumer rebuilds before using
is not an artefact, it is a cache — and a cache under a byte gate is a chore
with no beneficiary.

Two other generators here read the history, and both took the second road before
this one did: `scripts/standards/hotspots.ts` and
`scripts/standards/temporal-coupling.ts` ship no `--check` at all, and each page
prints the revision its dates were read at. That is the answer whenever the
artefact is worth committing — state the revision, drop the gate — and this one
is the case where the artefact was not worth committing either.
