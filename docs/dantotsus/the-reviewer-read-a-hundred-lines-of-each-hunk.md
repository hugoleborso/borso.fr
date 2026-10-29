---
date: 2026-10-29
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#234'
fix-pr: none (opened by this kaizen sweep, number not known when written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [.claude/hooks/rtk-rewrite.sh]
time-to-detect: one task
tags: [harness, hooks, rtk, technical-validation, review]
zone: .claude/hooks/rtk-rewrite.sh
weak-point: gate-measures-nothing
recurs: [the-rewrite-that-hid-git-from-the-guard]
---

# The reviewer read a hundred lines of each hunk

## Symptom

The second technical validator on PR #234 logged:

> git diff output is rewritten by an rtk wrapper that truncates hunks, so a
> validator must know to call rtk git diff --no-compact to read the whole diff

## Root-cause chain

1. **Why was the diff short?**
   The PreToolUse hook rewrites `git diff` into `rtk git diff`. rtk keeps 100
   added lines of a hunk and replaces the rest with one line. Measured on
   2026-10-29 on the plan commit of PR #234: `git --no-pager diff` printed 356
   added lines and `rtk git diff` printed 100, then
   `... (255 additions truncated)`.
2. **Why does that matter more for a diff than for other output?**
   Most rtk targets are logs and listings, where a summary is what the reader
   wants. A reviewer reads a diff to judge every line. A truncated hunk lets it
   pass code it never saw, and its report names the file as read.
3. **Why did the existing knowledge not stop it?**
   [`rtk-truncates-command-output.md`](https://github.com/hugoleborso/borso.fr/blob/d1be9c42/docs/knowledge/rtk-truncates-command-output.md)
   fires on `[N more lines]` and `rtk recall` markers. The diff marker reads
   `additions truncated`, so the hook printed nothing, and the validator found
   it on its own.

**Root cause:** thought *"rtk's compression is safe wherever the hook applies
it"*, actually *"a diff is only useful whole, and rtk cuts each hunk at 100
lines"*.

## Detection failure causes

- **Linter / static analysis:** none applies to a hook's choice of command.
- **Code review:** the hook's skip list was written for crashes (`biome`) and
  the worktree guard, not for output a consumer must read whole.
- **Knowledge:** the trigger matched other truncation markers, not this one.

## Countermeasure

- **Code:** `git diff` and `git show` go through the hook unrewritten.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** commits [self]

**The actual fix:**

```diff
+GIT_DIFF_COMMAND='(^|[;&|[:space:]])git[[:space:]]+(-C[[:space:]]+[^[:space:]]+[[:space:]]+)?(--no-pager[[:space:]]+)?(diff|show)($|[[:space:]])'
+if [[ "$CMD" =~ $GIT_DIFF_COMMAND ]]; then
+  exit 0
+fi
```

The property dropped: rtk's token savings on `git diff` and `git show`. A
diff's size is now the diff's size. `--stat` and `--name-status` still give a
short view when that is what the reader wants.

**Proof it acts:** the hook fed `git diff a b` before the change returned
`rtk git diff a b`. After it, these pass through unrewritten:
`git diff origin/main...HEAD -- a.ts`, `git -C /x show HEAD`,
`git --no-pager diff a b`, `cd x && git diff --stat`. `git status` and
`git log --oneline` are still rewritten.

**Sibling defects swept:** `git show` prints the same hunks, so it is in the
same exception.

## See also

- [`the-rewrite-that-hid-git-from-the-guard.md`](./the-rewrite-that-hid-git-from-the-guard.md),
  the earlier case of the rewrite changing what a command means to its consumer.
- [`../knowledge/rtk-truncates-command-output.md`](https://github.com/hugoleborso/borso.fr/blob/d1be9c42/docs/knowledge/rtk-truncates-command-output.md).
