---
date: 2026-11-05
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#263'
fix-pr: none (shipped by the lessons-from-pr-263 kaizen pull request, numbered once it opens)
fix-commits: [self]
eradication-level: 1
eradication-paths: [plugins/borso-harness/scripts/kaizen.sh]
time-to-detect: hours
tags: [self-improvement-loop, harness, agents, git]
zone: plugins/borso-harness/scripts/kaizen.sh
recurs: none (the earlier loss of agent friction was agents never told to log, not agents logging to the wrong file)
---

# Two agents logged their friction to a file the archive never opens

## User impact

| | Seen | Expected |
| --- | --- | --- |
| PR #263's archive | 1 line from the main session, none from the two worktree agents | 6 lines, 3 from each agent |

The main session found the agents' lines by chance, in each worktree's own `KAIZEN.md`, and copied them by hand (measured: 5 lines recovered).

## Causal chain

- The archived friction log for PR #263 was missing every line the worktree agents logged.
  - `kaizen.sh archive` copies `KAIZEN.md` from the main checkout.
    - Each agent called `scripts/kaizen.sh` from its own worktree.
      - `kaizen.sh` resolved the file under `harness-path.sh --root`, which is the git top level of the current directory, so a worktree got its own `KAIZEN.md`.

## Root cause of occurrence

*Thought one repository has one friction log, actually every git worktree has its own top level.*

`harness-path.sh` says the root is "the git top level of the current directory". In a linked worktree that is the worktree, not the checkout the session archives from.

## Detection failure causes

- **kaizen.sh:** it printed success on every write, because the write did succeed, into a file nobody reads.
- **archive:** it reads one path and cannot know another log exists.

## Countermeasure

The two worktrees' lines were copied into the archive by hand on PR #263.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** the lessons-from-pr-263 kaizen pull request · commit `[self]`

```diff
-KAIZEN_FILE="$REPO_ROOT/$("$HARNESS_PATH" kaizenFile)"
+main_checkout() {
+  local common
+  common="$(git -C "$REPO_ROOT" rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" ||
+    { printf '%s' "$REPO_ROOT"; return; }
+  printf '%s' "$(dirname "$common")"
+}
+KAIZEN_FILE="$(main_checkout)/$("$HARNESS_PATH" kaizenFile)"
```

Every worktree shares one common git directory, and its parent is the main checkout, so every writer appends to the one file `archive` reads.

**Proof it can fail:** from a scratch worktree, the old script wrote `old probe` into the worktree's own `KAIZEN.md` (1 line there, 0 in the main log). The new script raised the main log from 2 lines to 3 and created no file in the worktree.

**Similar instances:** `grep -rn 'harness-path.sh" --root' plugins/borso-harness/scripts` finds no other script that writes a shared file under the root.
