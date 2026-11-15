---
date: 2026-11-15
introduced-at: implementation
detected-at: operator-deploy
severity: medium
related-pr: '#351'
fix-pr: none (lands with the kaizen pull request for PR #351)
fix-commits: [self]
eradication-level: 1
eradication-paths: [.husky/pre-push]
time-to-detect: hours
tags: [git, gates, ci, github-actions]
zone: .husky/pre-push
weak-point: gate-measures-nothing
recurs: [the-conflict-warning-that-spoke-after-the-push]
---

# The union merge only this checkout could see

## User impact

The operator validated PR #351 on a preview that did not hold its last commit,
and waited 80 minutes for CI that never started. Separately, main shipped an
ADR index that its own first line says does not exist.

| | Seen | Expected |
| --- | --- | --- |
| 07:02 UTC, push of `4c0193b` | pre-push passed every gate; the session told the operator "the preview redeploys with this commit" | pre-push refuses: the branch conflicts with main |
| 07:02 to 08:23 UTC | no workflow run at all for `4c0193b` (measured, `list_workflow_runs` on the branch) | CI and a preview on `4c0193b` |
| 08:22 UTC, "Parfait merge" | `get_check_runs` answers `{"total_count":0}`, then `git merge origin/main` conflicts | a green pull request ready to merge |
| main after PR #353 | `docs/adr/README.md` says "This folder keeps no list of its records" above a 71-row table and 160 lines of lists | the 69-line page PR #352 wrote |

## Causal chain

- CI did not run on `4c0193b` for 80 minutes.
  - GitHub could not build `refs/pull/351/merge`, because PR #341 (merged 06:51 UTC) and the branch both edited `docs/adr/README.md`.
    - The pre-push conflict guard, which exists for exactly this, let the push through.
      - It ran `git merge-tree <base> HEAD origin/main` and searched for conflict markers. There were none.
        - Git merges read `.gitattributes` from the worktree. The branch, cut on 2026-11-14, still declared `docs/adr/README.md merge=union`, so the local merge kept both sides and reported no conflict.
          - GitHub's merge ref applies no merge driver. The union existed only in this checkout.
- The ADR index came back on main.
  - PR #352 deleted the index and the `.gitattributes` line together, at 07:04 UTC.
    - PR #353's branch, cut before that, merged main in with the union still in its worktree. The union kept every deleted row, and the pull request merged at 07:18 UTC.

Reproduced this session on a clone at `4c0193b` with `origin/main` at `fd4332550`:

```
old guard:  exit=0
new guard:  [pre-push] this branch conflicts with origin/main, so GitHub would run no CI on it.  exit=1
git merge-tree --write-tree HEAD origin/main                    -> clean
GIT_ATTR_SOURCE=<empty tree> git merge-tree --write-tree ...    -> CONFLICT
```

## Root cause of occurrence

*Thought the local merge is the merge GitHub makes, actually the local merge
applies the checkout's merge drivers and GitHub's applies none.*

The guard's own comment named GitHub's merge ref as what it predicts. The
`merge=union` lines were added by PR #304 to stop parallel sweeps colliding on
two tables, and their comment said only that "a union merge keeps both sides".
Neither text says the union happens on one side of the comparison only.

The union was a tool laid over a layout problem. Two branches conflicted on
those tables because every pull request appended to the same file. What stops
that conflict is one file per record, which PR #352 shipped: the ADR index,
the cost table and the README inventories became one file each, found with
`ls` or `grep`, and the `.gitattributes` lines went with them. The union then
only had harm left to do, on branches cut before it was removed.

## Detection failure causes

- **pre-push:** it measured a different merge than the one it guards, so it passed.
- **The session:** it piped the push through `grep -E "pass:|fail"` and told the operator the preview was redeploying without reading a run. The empty-checks hook only speaks when someone reads the checks, which happened at merge time.
- **ADR index:** `scripts/check-adr-numbers-resolve.sh` checks that rows resolve, and every resurrected row did.

## Countermeasure

The ADR index is restored to the page PR #352 wrote, which drops the rows PR
#353's merge brought back. The new ADR of PR #351 is marked accepted in its own
file, which is where its status now lives.

## Eradication

**Type:** structural impossibility (level 1). The guard now computes GitHub's
merge: attributes come from the empty tree, so no driver in any checkout can
make a conflicted branch look clean.

**Reference:** this commit.

```diff
-  merge_base=$(git merge-base HEAD origin/main 2>/dev/null || true)
-  if [ -n "$merge_base" ] &&
-    git merge-tree "$merge_base" HEAD origin/main 2>/dev/null | grep -q '^+<<<<<<<'; then
+  empty_tree=$(git hash-object -t tree /dev/null)
+  conflict_status=0
+  GIT_ATTR_SOURCE="$empty_tree" git merge-tree --write-tree --name-only HEAD origin/main \
+    >/dev/null 2>&1 || conflict_status=$?
+  if [ "$conflict_status" -eq 1 ]; then
```

**Proof it can fail:** the guard block run on the clone above, with the
branch's `.gitattributes` in the worktree, prints the refusal and exits 1. The
old block exits 0 on the same state. With `origin/main` at the branch's parent
the new block exits 0.

**Similar instances:** `git grep -n 'merge-tree' -- .husky scripts .claude`
finds one other caller, `scripts/pre-push-range.sh`. It computes which files
the gates read, not whether GitHub can merge, so it is left as is. `git ls-files '*.gitattributes'` finds none on main
since PR #352, so no merge driver is left to diverge from GitHub's.
