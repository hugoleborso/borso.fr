---
date: 2026-08-20
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#63'
fix-commits: [957846c4d2, de7a3458d, 5ce372fdb, 9b8d380ed]
eradication-level: 2
eradication-paths: [.husky/pre-push, scripts/hooks/checks/empty-checks-means-conflict.core.ts, scripts/hooks/checks/knowledge-triggers.core.ts, docs/knowledge/a-conflicted-pull-request-gets-no-checks.md]
time-to-detect: 1 hour
tags: [ci, github-actions, git, knowledge-corpus, tooling]
zone: docs/knowledge
weak-point: prose-stands-in-for-a-check
recurs: [a-knowledge-entry-did-not-stop-the-second-hit]
---

# The entry existed, and I lost the hour anyway

## User impact

A push to PR #63 produced no workflow run, not a failed one, none. The preview
stayed on a commit from before the feature was rewritten. The operator noticed
before any gate did: *"Preview was not redeployed"*.

| | Seen | Expected |
| --- | --- | --- |
| Checks after the push | an empty list | a run, or a reason on the page |
| The session's triage | an hour testing draft state, Actions quota and pusher identity | the answer from `docs/knowledge/a-conflicted-pull-request-gets-no-checks.md`, written two days earlier from PR #62 |

The answer was `mergeable_state: "dirty"`. The branch conflicted with `main`,
GitHub could not build `refs/pull/<n>/merge`, and so dispatched nothing. The
entry described that symptom, the field to read, the local `git merge-tree`
check, and that closing and reopening changes nothing.

## Causal chain

- The operator's preview stayed stale for an hour.
  - The push dispatched no workflow run.
    - The branch conflicted with `main`, so GitHub built no merge ref.
  - The session spent the hour on wrong theories.
    - It tested the draft state, then Actions quota (other pull requests ran
      in the same minutes), then the pusher's identity (closing and reopening
      as the owner, which also produced nothing).
      - The only signal was an empty checks list. It carries no error string,
        job name or stack trace to search for. The one useful token,
        `mergeable_state`, is the answer, not the question.
        - The knowledge entry sat in `docs/knowledge/` and reached a session
          only when someone searched for it. The corpus had no way to put an
          entry in front of the session at the moment its symptom appeared
          (Machine).

## Root cause of occurrence

*Thought writing the entry is what stops the next person losing the hour,
actually an entry only helps somebody who thinks to look for it, and a failure
whose signature is silence gives nobody a reason to look.* (Machine)

PR #62's sweep stopped at the knowledge rung. The corpus was pull-only, so
capture was not eradication.

## Detection failure causes

- **Typing, linter, CI:** inapplicable. The branch was locally perfect and
  every gate passed, which made the silence more confusing.
- **Local validation:** nothing local observes a ref GitHub computes. `git
  status` was clean and the branch was level with its remote.
- **Code review:** the conflict is invisible in a diff.
- **The corpus:** it held the answer and had no way to offer it.

## Countermeasure

Commit `9b2ff2b` merged `main` into the branch, resolving a rename collision
across three files and a move of every source file into `site/src/`. Dispatch
resumed on the next push.

## Eradication

**Type:** DevX check (level 2). A conflicted branch cannot be pushed, and a
session that reads an empty checks list is told it is a conflict.

**Reference:** three mechanisms hold it today.

- `.husky/pre-push` refuses a push that conflicts with `origin/main`, on every
  branch, before the gates run. `957846c4d` (PR #71) first shipped it as a
  warning in the `claude/*` arm, after the push. `5ce372fdb` (#255) made it a
  refusal for every branch, because on PR #252 the warning came after the push
  landed. `9b8d380ed` (#359) moved it to `merge-tree --write-tree` with
  attributes read from the empty tree, after a union merge driver hid a
  conflict on PR #351.
- `docs/knowledge/a-conflicted-pull-request-gets-no-checks.md` carries
  `triggers: output: '"total_count":\s*0'`, so
  `scripts/hooks/checks/knowledge-triggers.core.ts` prints the entry the moment
  a checks call comes back empty.
- `scripts/hooks/checks/empty-checks-means-conflict.core.ts`, from
  `de7a3458d`, adds context to an empty `get_check_runs` or `get_status`
  answer: "A conflicted pull request gets NO workflow run at all".

```diff
+  GIT_ATTR_SOURCE="$empty_tree" git merge-tree --write-tree --name-only HEAD origin/main \
+    >/dev/null 2>&1 || conflict_status=$?
+  if [ "$conflict_status" -eq 1 ]; then
+    echo "[pre-push] this branch conflicts with origin/main, so GitHub would run no CI on it." >&2
+    exit 1
```

**Proof it can fail:** the first version matched `'^<<<<<<<'`, and `git
merge-tree` prints conflict hunks as a diff, so every marker carried a `+` and
the pattern matched nothing. It was caught against real output on a
constructed conflict: `^+<<<<<<<` matched once, and the branch against `main`
zero times. The `--write-tree` form reads the exit status, 1 on a conflict,
and needs no pattern.

**Similar instances:** the trigger mechanism holds the class. A knowledge
entry with `triggers:` reaches the next session at the moment its symptom
shows, so a silent failure no longer depends on someone thinking to search.
`grep -L "^triggers:" docs/knowledge/*.md` lists the entries that still wait
to be searched.
