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
