---
date: 2026-10-15
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#118'
fix-commits: [self]
eradication-level: 2
eradication-paths: [.husky/pre-push]
time-to-detect: minutes
tags: [git, gates, agents, pre-push]
zone: .husky/pre-push
recurs: [a-force-push-re-gated-everything-main-had-merged]
---

# Two sessions, one branch

## User impact

Two Claude sessions drove PR #118 at once. One had written it. The operator
started the other later to finish the merge work. Twice on 2026-10-12, both
merged main into the branch within minutes of each other, as reported by
the session that wrote this entry.

| | Seen | Expected |
| --- | --- | --- |
| The second push | More than ten minutes of tests and mutation, then git rejects the push as non-fast-forward | A refusal in under a second that names the other session's commit |
| After the rejection | The losing session throws away its merge, takes the other one and reapplies its own commit by hand | Fetch, merge, push again |

Only a session pushing to a branch another writer had moved was affected. A
push to a new branch, or to one this checkout had fetched, was not.

## Causal chain

- The second push ran every gate, then git rejected it.
  - Git calls pre-push before it checks for a fast-forward, so the hook ran.
    - The hook read the remote's current commit from stdin. That commit was
      missing from the local object store.
      - Another session had pushed it. A commit on the remote branch that this
        checkout never fetched can only come from another writer.
    - The hook fell into its last branch and gated the whole branch since main.
      The faulty lines, as they stood until the fix:

      ```sh
      if [ -n "$push_base" ] && git cat-file -e "$push_base" 2>/dev/null; then
        range_label="this push"
      else
        # an unknown remote commit lands here, as if the branch were new
        push_base=$(git merge-base HEAD origin/main 2>/dev/null || echo HEAD)
        range_label="the whole branch since main (no remote ref for this branch yet)"
      fi
      ```

      - Commit `9fc3b9a40` ("perf(ci): gate the push, not the branch") wrote
        this branch with the label "the whole branch (new or unfetchable remote
        ref)". It grouped an unfetchable commit with a new branch and sent both
        to the widest gate.
        - Commit `239b78b6d` relabelled it "no remote ref for this branch yet",
          and the unfetchable case lost its name.

## Root cause of occurrence

*Thought an unknown remote commit is safe to handle by gating more, as for a
new branch. Actually, on a branch that exists upstream it means another writer
pushed, and git refuses a plain push over it only after every gate has run.*
(Material, inferred.)

The agent that wrote `9fc3b9a40` was building a faster gate, not a race guard.
Two facts held the answer: git runs pre-push before its fast-forward check, and
an unfetched remote commit means a second writer. Neither was in any document
or test it had loaded. `grep -ril 'non-fast-forward' docs/knowledge` finds
nothing even today. So the conservative fallback, "gate more when unsure",
looked correct.

One why further, two sessions held one branch because the operator started a
second session on a branch the first still owned. That is Method. CLAUDE.md now
says "One session per feature. It ends at merge."

## Detection failure causes

- **Hook tests:** the fall-through branch had a label but no test. No shell
  gate here had a test when `9fc3b9a40` landed. `239b78b6d` added the first
  one, for the PreToolUse hooks only.
- **Label:** the label described a different situation. A new branch arrives
  with all zeros, which the read loop already handles before this branch.
- **Harness:** nothing tells a session that another session holds the same
  branch.

## Countermeasure

Pre-push stops before any gate when the remote branch sits on a commit this
checkout has never fetched. It prints the two commands that bring the other
session's work in.

Exercised by hand both ways. An unknown remote commit exits 1 in under a
second, and a known one goes on to the gates. A force push after
`git checkout -B <branch> origin/main` is unaffected, because its remote
commit is one this checkout has fetched.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `4b883dfe4` ("docs: lessons from PR #118 (#181)"), which
added this file and the guard. The guard is still in `.husky/pre-push` today.

```diff
+if [ -n "$push_base" ] && ! git cat-file -e "$push_base^{commit}" 2>/dev/null; then
+  echo "[pre-push] origin/$pushed_ref is at $push_base, a commit this checkout has never fetched:" >&2
+  echo "  another session pushed to this branch. Bring its work in, then push again:" >&2
+  echo "    git fetch origin $pushed_ref && git merge origin/$pushed_ref" >&2
+  exit 1
+fi
```

**Proof it can fail:** replayed by hand only. `git grep "never fetched" --
'*.test.ts'` finds no test, so the guard can rot unseen. The rest of the range
logic moved to `scripts/pre-push-range.sh`, whose header says each inline fix
"was fixed four times, each time replayed by hand".

**Proposed:** move the unknown-commit check into `scripts/pre-push-range.sh`,
which already receives the remote sha, and make it exit non-zero there. Add the
unfetched-commit case to `scripts/pre-push-range.test.ts`, which already builds
temporary git repositories. A later edit that drops or weakens the guard would
then fail the test suite instead of passing unseen.

**Similar instances:** none. Pre-commit has no remote to compare against. The
deliberate rewrite of a branch is handled by the case in
[a-force-push-re-gated-everything-main-had-merged](./a-force-push-re-gated-everything-main-had-merged.md).
The same race inside one checkout is
[two-agents-in-one-working-tree](../knowledge/two-agents-in-one-working-tree.md).
