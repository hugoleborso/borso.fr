---
date: 2026-11-09
introduced-at: implementation
detected-at: ci
severity: low
related-pr: none (mutate-changed.sh has read the commits only since it was written; no one pull request introduced it)
fix-pr: none (the kaizen pull request for PR #281 carries it)
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/mutate-changed.sh]
time-to-detect: minutes
tags: [mutation, stryker, gates, git, ci, meta]
zone: scripts/mutate-changed.sh
weak-point: gate-measures-nothing
recurs: [a-gate-that-reported-success-while-measuring-nothing]
---

# The gate that graded a file git had not met

## User impact

An agent ran the mutation gate before pushing, read that every changed gated
file had passed, pushed, and CI failed on a surviving mutant in a file the local
run had never opened.

| | Seen | Expected |
| --- | --- | --- |
| 2026-11-07 10:56, local | `[mutate-changed] every changed gated file passed mutation` | a survivor in `quality-datasets.core.ts`, which CI found: `findCeiling` could ignore the application and no test noticed |

One round trip to CI, and a message that was not merely silent about the file
but positively asserted it had passed.

## Causal chain

- The local run reported every changed gated file passing
  - `quality-datasets.core.ts` was not in the changed set it graded
    - The changed set came from `git diff --name-only <merge-base> HEAD`
      - Which compares two commits, so a file that is untracked, staged or
        modified in the working tree is in neither side of it
        - And the new dataset builder was untracked at that moment, written
          minutes earlier in the same session
          - So Stryker was never pointed at it, `runs` counted the runs that did
            happen, and the closing message described those

## Root cause of occurrence

*Thought the gate's subject is the branch, actually its purpose is to predict
the CI run, and CI grades the branch plus everything the push is about to add
to it.*

The script's own closing line carried the belief out loud:

> no gated file changed between $base and HEAD, so nothing ran; commits only,
> uncommitted work is not read

That sentence is accurate about the code and wrong about the job. It reads as a
caveat, so it was written once and never acted on, which is the shape
[docs/quality/weak-points.md](../quality/weak-points.md) calls
`prose-stands-in-for-a-check` wrapped around the one it calls
`gate-measures-nothing`.

## Detection failure causes

- **The gate's own output:** it reports how many runs it made and that they
  passed. A run that was never started is indistinguishable from a file with no
  mutants, and the summary line calls both success.
- **Shell:** nothing types a file list.
- **CI:** CI caught it, which is the backstop working and also the thing the
  local gate exists to spare. The push had already happened.
- **Code review:** `git diff <base> HEAD` is the obviously correct way to ask
  what a branch changed. It is the wrong question.

## Countermeasure

`df66810` carried the test that killed the mutant. The gate itself was left as
it was.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** this commit, on the kaizen branch for PR #281.

The changed set is now the commits plus the working tree, untracked files
included, so the local run grades the files CI will grade once they are
committed. Renames print `old -> new` in porcelain output, and the new name is
the file on disk.

```diff
-changed=$(git diff --name-only "$(git merge-base "$base" HEAD)" HEAD)
+committed=$(git diff --name-only "$(git merge-base "$base" HEAD)" HEAD)
+uncommitted=$(git status --porcelain=v1 --untracked-files=all | sed 's/^...//;s/.* -> //')
+changed=$(printf '%s\n%s\n' "$committed" "$uncommitted" | sed '/^$/d' | sort -u)
```

A gated file that exists on disk and is not in the changed set is no longer
expressible: every path git can see is in one of the two lists. The closing
message changed with it, because a comment that outlived its code is what
[docs/dantotsus/the-coverage-gate-a-wrong-comment-kept-in-ci.md](./the-coverage-gate-a-wrong-comment-kept-in-ci.md)
is about.

**Proof it can fail:** an untracked `scripts/quality/probe-untracked.core.ts`
with a test that calls it and asserts only `typeof`. The two changed sets, on
the same tree:

```
=== what the old script read ===
scripts/quality/dashboard-page.core.ts
=== what it reads now ===
scripts/quality/dashboard-page.core.ts
scripts/quality/probe-untracked.core.ts
```

and the run, exit 1 where the old one printed
`every changed gated file passed mutation`:

```
[mutate-changed] tooling: 2 file(s)
 probe-untracked.core.ts  |  50.00 |   50.00 |        1 |         0 |          1 |        0 |        0 |
[mutate-changed] mutation failed for: tooling: 2 file(s)
```

**Similar instances:** `grep -rn 'git diff --name-only' scripts/ .husky/` names
the other diff-driven selections. `.husky/pre-commit` reads the index, which is
correct for a commit hook, and `.husky/pre-push` reads the pushed range, which
is correct for a push. This was the only one whose answer is checked against a
later CI run of the same thing.
