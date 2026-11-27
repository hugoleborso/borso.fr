---
date: 2026-08-20
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#49'
fix-commits: [239b78b6d1]
eradication-level: 2
eradication-paths: [.husky/pre-push, scripts/pre-push-range.sh]
time-to-detect: 11 minutes
tags: [ci, git, hooks, gates]
zone: .husky/pre-push
---

# The push that paid for twenty-five commits it was not pushing

## User impact

A one-line change to `.claude/settings.json`, adding
`"outputStyle": "Concise"`, was pushed from a hosted session. The push did
not return. Two attempts were abandoned, one after two minutes and one after
nine, before anyone read the first line the hook had printed:

```
[pre-push] gating 520 changed file(s) — range: the whole branch (new or unfetchable remote ref)
[pre-push] start: mutation-borso-fr
[pre-push] borsouvertures: mutating 27 changed gated file(s)
…
```

| | Seen | Expected |
| --- | --- | --- |
| Pushing one line of JSON | 520 gated files, six full mutation suites and four test suites, abandoned after nine minutes | 1 gated file, done in about thirty seconds |

After `git fetch origin main`, the identical push printed
`gating 1 changed file(s)` and completed in about thirty seconds (measured in
that session).

## Causal chain

- The hook gated 520 files for a one-line push.
  - It took its base from `git merge-base HEAD origin/main`, which was
    `347cc54`, twenty-five commits behind the real tip of `main`. Everything
    merged in between counted as changed by this push.
    - The branch did not exist upstream yet, so git gave the hook an all-zero
      remote sha, and the hook fell back to the fork point:

      ```sh
      push_base=$(git merge-base HEAD origin/main 2>/dev/null || echo HEAD)   # ← the faulty line
      ```

      - `origin/main` is a local ref, and nothing in the session had updated
        it since the container cloned the repository at start.
        - Commit 9fc3b9a40 (PR #49) wrote the fallback to fix a hook that
          keyed on `merge-base` every time. It kept the old behaviour for the
          rare case and computed it from a ref it never refreshed.
          - A hosted container clones once and never fetches, so `origin/main`
            is stale by construction there. **Machine.**

## Root cause of occurrence

*Thought the fallback base is the branch's fork point, actually it is the
fork point as of the last fetch of `main`, and in a container that clones
once that is an unbounded distance in the past.* **Machine:** the hosted
session never refreshes the ref, and nothing in the hook did either.

## Detection failure causes

- **Linter:** no linter models what a git ref will hold at run time. The
  expression is correct git, and its answer is data.
- **Local validation:** the commit says all four fallback cases were
  exercised before it landed. They ran right after a clone, or on a machine
  where ordinary work fetches `origin/main` constantly (inferred). The failing
  condition exists only where nobody fetches.
- **CI:** CI never runs this hook. `full-suite.yml` runs everything
  unscoped, so the wide range looks normal there.
- **Hook output:** the label read `the whole branch (new or unfetchable
  remote ref)`. Both states it names belong to the remote branch, so it read
  as an explanation of a wider range, not as a warning about the ref that
  decided its width.
- **Review:** the fallback read as unchanged behaviour inside a large
  improvement, and drew no attention.

## Countermeasure

`git fetch --quiet origin main` runs before either base is computed, so the
ref the base is read from is the ref that exists. The hook is about to open a
connection to the same remote, so the cost is one more round trip.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`239b78b6d`](https://github.com/hugoleborso/borso.fr/commit/239b78b6d1).

```diff
+git fetch --quiet origin main 2>/dev/null || true
+
 if [ -n "$push_base" ] && git cat-file -e "$push_base" 2>/dev/null; then
   range_label="this push"
 else
   push_base=$(git merge-base HEAD origin/main 2>/dev/null || echo HEAD)
-  range_label="the whole branch (new or unfetchable remote ref)"
+  range_label="the whole branch since main (no remote ref for this branch yet)"
 fi
```

The fetch still sits above every reader of `origin/main` in `.husky/pre-push`
(line 68). The range itself now lives in `scripts/pre-push-range.sh`, which
has a vitest suite, `scripts/pre-push-range.test.ts`. The new label names
the range, which is the number the reader has to react to when it is 520 and
not 1.

**Proof it can fail:** not pasted when the entry was written. The measured
before and after are the 520 and 1 files of the user impact.

**Similar instances:** PR #71 added a second base,
`main_tip=$(git rev-parse origin/main)`, reading the same ref. Its
measurement table had a row for "`origin/main` unavailable" and none for a
stale one. The fetch sits above both, so that base gets a fresh answer too.
`grep -rln 'origin/main' scripts .husky` lists the other readers.
`scripts/check-branch-context.sh` reads `origin/main` to tell whether the
branch is already merged. It runs from SessionStart
(`scripts/install-repo-deps.sh`), so it reads the ref near the clone, when
it is freshest (inferred, a resumed session may read it later).
