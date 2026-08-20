# A rebase replays the work and drops the reconciliation

A long branch that merges its upstream in repeatedly carries two kinds of
content, and only one of them survives being replayed linearly.

The commits carry **the work**: the files you wrote, the rules you added.
The merge commits carry **the reconciliation**: which side of a document to
keep when both branches edited it, which of two independently-written modules to
delete, which suppression to trade for code that needs none. That reconciliation
exists nowhere else. It is not in either parent — it is the difference between
the merge's tree and what either parent would have produced alone.

`git rebase` drops merge commits. So replaying a branch whose history contains
six merges replays the work and none of the six reconciliations, and the tree
comes back in the *older* of the two shapes everywhere both branches had
touched a file. Nothing warns you: the rebase reports success, the tests pass,
and the regression is prose and hardening quietly reverted to a state that was
correct three weeks ago.

Measured on PR #55, which merged its upstream in six times:

| Approach | Result |
| --- | --- |
| `rebase -X ours` (prefer the upstream side) | ran to completion, **52 files** differing from the merge CI had verified; resurrected a module that had been deliberately deleted |
| Resolve each conflict against the tested tree where decidable | **152 guessed resolutions**, still 36 files differing |
| `rerere` trained on the six real merge commits | **did not fire once** |
| Read the code at every conflict | correct, and slow |

## Why `rerere` does not help

`rerere` keys on the *preimage* — the exact conflicted-hunk text. A rebase
conflict and the merge conflict it descends from have different preimages,
because the rebase is replaying one commit onto a different base rather than
joining two whole histories. Training on 56 recorded resolutions from six merge
commits produced zero hits.

## `git cherry` is not the tool for "already in main"

Thirty of the branch's sixty-six commits were duplicates of work already merged
upstream, and `git cherry` reported every one of them as new. It compares
**patch ids**, and a patch id changes as soon as the upstream branch is itself
rebased or its content evolves — which is exactly what had happened.

What found them was the commit *subject*:

```bash
git log --format=%s origin/main > /tmp/upstream-subjects
git log --format='%H %s' origin/main..HEAD |
  while read -r sha subject; do
    grep -Fqx "$subject" /tmp/upstream-subjects && echo "drop $sha"
  done
```

Subjects survive a rebase; patches do not. Feed the result to a
`GIT_SEQUENCE_EDITOR` script that rewrites those lines to `drop`.

## The procedure that worked

1. **Keep the pre-rebase tip as an oracle.** `git branch backup-premerge-<sha>`
   before starting. Its tree is the one CI verified. Every resolution can then
   be checked rather than argued about:
   `git diff --stat backup-premerge-<sha> HEAD` should converge on empty.
2. **Drop the duplicates first**, by subject, so you are not re-applying evolved
   work onto itself.
3. **Resolve each remaining conflict by opening both sides.** The oracle tells
   you which one the merge chose; the code tells you why, and sometimes the
   merge was wrong — one of the six had left a block in `.husky/pre-commit`
   twice, and the linear replay kept the correct single copy.
4. **Auto-resolve only generated artefacts.** Anything with a generator gets the
   incoming copy and one regeneration at the end; resolving them per commit
   costs a generator run each and is thrown away.
5. **Restore the reconciliation deliberately**, as commits named for what they
   restore, so a reviewer can see what came back and why. On PR #55 that was
   three commits: the standards prose, the mutation hardening, and the
   regenerated history reports.

## The rule

**If a branch's merges made decisions, a rebase is a rewrite, not a
reformatting.** Budget for reading every conflict, keep the pre-rebase tip as
the oracle, and diff against it at the end. A rebase that reports success is not
evidence of anything.

See also
[`destructive-git-with-uncommitted-verification-work.md`](./destructive-git-with-uncommitted-verification-work.md)
and
[`two-agents-in-one-working-tree.md`](./two-agents-in-one-working-tree.md).
