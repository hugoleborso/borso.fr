---
date: 2026-08-18
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#59'
fix-pr: '#62'
fix-commits: [0770ef3]
eradication-level: 1
time-to-detect: hours
tags: [ci, gates, shell, meta, self-improvement-loop]
---

# The gate that failed on a broken pipe

## Symptom

The `build` job of PR #62 failed, twelve minutes after PR #59 merged the check
it failed in. The whole error:

```
find: ‘standard output’: Broken pipe
find: write error
##[error]Process completed with exit code 1.
```

Nothing about mutation configuration, which is what
`scripts/check-mutation-covers-gated-files.sh` is there to verify. The pull
request it fired on changed no application code at all.

## Root-cause chain

1. **Why did the script exit non-zero?** `find … | head -1` returned 141 —
   128 plus SIGPIPE.
2. **Why did `find` take SIGPIPE?** `head -1` prints the first line and exits,
   closing the pipe. Anything the producer writes afterwards fails.
3. **Why did that fail the script?** `set -o pipefail` makes the pipeline carry
   the producer's status, and `set -e` ends the script on it. Both are set,
   correctly, at the top.
4. **Why did it pass on the pull request that added it?** It is a race. If
   `find` finishes writing before `head` closes, nothing is signalled. The
   `-not -path '*/node_modules/*'` filter is a predicate, not a prune, so
   `find` walks every dependency file in the workspace to the end — tens of
   thousands of paths against a reader that stops at one.
5. **Why is a race worse here than a plain failure?** The gate's own subject is
   a check that measured nothing. A gate that fails at random gets re-run, then
   ignored, and its next red is read as noise.

**Root cause:** thought *"`| head -1` is how you ask whether anything matched"*,
actually *"under `pipefail` it is how you ask the producer to die mid-sentence,
and whether that ends the script depends on how much it still had to say"*.

## Detection failure causes

- **Typing:** shell.
- **Linter / static analysis:** `actionlint` reads workflow YAML, not the
  scripts a workflow calls. No shellcheck runs in this repository.
- **Functional validation locally:** it passes most runs. Measured here, the
  original script failed once in five; after the fix, zero in thirty.
- **CI:** it was green on the pull request that introduced it, which is the
  strongest possible false assurance for a race.
- **Code review:** `find … | head -1` reads as idiomatic, and it is — outside
  `pipefail`.

## Countermeasure

- **Code:** commit `0770ef3` — both existence tests use `find … -print -quit`.
- **Operator action:** none.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — there is no pipe left to break)

**Reference:** [PR #62](https://github.com/hugoleborso/borso.fr/pull/62) · commit [`0770ef3`](https://github.com/hugoleborso/borso.fr/commit/0770ef3)

**The actual fix:**

```diff
-    -not -name '*.test.*' | head -1)
+    -not -name '*.test.*' -print -quit)
```

`-quit` is what the code meant: stop at the first match. It removes the pipe,
so no signal can be raised, and it stops the walk instead of filtering every
remaining path — the check is also faster for it.

**Sibling defects swept:** `.claude/hooks/pretool-gh-pr-create.sh` had the same
shape, `find docs/features -type d -name validation | head -n1` under
`pipefail`, and now uses `-print -quit`. In a hook the consequence is worse than
a red build: 141 is not 2, so the gate would have skipped silently rather than
refused. The repository's six other `| head` pipelines read from `sed`, `grep`,
`ls`, `dig`, `sort` and `actionlint -version` over inputs of a few lines, which
fit the pipe buffer and cannot signal; they are left alone.

## See also

- [`the-gate-that-was-never-pointed-at-the-code`](./the-gate-that-was-never-pointed-at-the-code.md) — the dantotsu this check is the eradication of.
- [`two-guard-hooks-that-never-guarded`](./two-guard-hooks-that-never-guarded.md) — the sibling hook, and the reason a wrong exit code in a hook is invisible.
- [`a-timeout-under-parallel-gates-is-not-a-regression`](../knowledge/a-timeout-under-parallel-gates-is-not-a-regression.md) — the other kind of red that is about the harness rather than the code.
