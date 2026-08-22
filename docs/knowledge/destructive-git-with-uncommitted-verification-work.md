# Verifying a fix by breaking the code costs you the fix, three times running

Observed 2026-08-15, three times in one session, each time losing 10–20 minutes.

The pattern is specific to proving an eradication works. You write the check,
then you want to show it catches the original defect, so you reintroduce the
defect and run the check. Then you undo the reintroduction:

```bash
git checkout -- scripts/architecture/architecture-page.ts   # reverts the probe
```

That reverts the **eradication too**, because both edits were uncommitted in the
same file. `git reset --hard` after a throwaway probe commit does the same thing
to every uncommitted file in the tree.

It is not a git surprise — it is exactly what those commands say they do. The
trap is that "undo my experiment" and "undo my work" are the same command when
both live in the working tree, and the experiment is the thing you are thinking
about.

**Commit the eradication before you break anything to test it.** Then the probe
is the only uncommitted change, and `git checkout --` means what you wanted. If
the probe needs a commit of its own, make it on a throwaway branch and delete
the branch — never `reset --hard` the branch you are working on.

A cheaper variant for a single file: copy it to `/tmp`, break it, run, copy
back. Used for `.husky/pre-commit` and `eslint-rules/impurity.js` in the same
session, with no loss.

The symmetric hazard, already recorded:
[`docs/dantotsus/broad-pkill-killed-another-agents-measurement.md`](../dantotsus/broad-pkill-killed-another-agents-measurement.md)
— a cleanup whose blast radius was wider than its intent.

## This is now a gate, not only a warning

Two more losses happened after this entry was written, the second of them in the
sweep that read it. A written warning about a command you have typed a thousand
times is consulted by nobody at the moment it matters, so
`.claude/hooks/pretool-no-discarding-reset.sh` refuses `git reset --hard`,
`git checkout -- <path>` and `git restore <path>` while tracked modifications
exist, lists them, and names the two ways through. On a clean tree the command
runs untouched.

This entry stays because its examples are the evidence for the gate. See
[`a-warning-that-had-to-become-a-gate`](../dantotsus/a-warning-that-had-to-become-a-gate.md).

## `git stash drop` after a partial restore, and where the untracked files went

_2026-08-21, during the sweep of PR #83._ Docs were stashed with
`git stash push -u` so a run of code-only commits could pass the doc-link gate,
which reads the working tree for link sources and the index for link targets.
Restoring afterwards with `git checkout stash@{0} -- docs/` brought back the
three modified files and none of the four new ones, and `git stash drop` then
made the stash unreachable.

The reason is that a `-u` stash is three commits, not one. Tracked
modifications are the stash commit itself; the index is its second parent; the
**untracked files are its third parent**, and a pathspec checkout of the stash
ref reads only the first. `git stash pop` would have restored all three.

Nothing was lost, because a dropped stash is unreachable rather than deleted:

```bash
git fsck --unreachable | grep commit | awk '{print $3}' \
  | while read -r c; do echo "$c :: $(git log -1 --format='%s' "$c")"; done
# 4885ef9 :: untracked files on claude/lessons-from-pr-83: 6b27c95 …
git checkout 4885ef9 -- docs/
```

The three stash commits are recognisable by their subjects — `WIP on`,
`index on`, and `untracked files on`. Prefer `git stash pop`; when a pathspec
restore is what you want, do it from the untracked parent as well.
