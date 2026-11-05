---
date: 2026-11-04
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#249'
fix-pr: none (the kaizen pull request is opened after this entry is committed)
fix-commits: [self]
eradication-level: 2
eradication-paths: [plugins/borso-harness/hooks/pretool-merge-strands-no-work.sh, plugins/borso-harness/hooks/hooks.json]
time-to-detect: minutes
tags: [agents, git, hooks, harness, pragma]
zone: CLAUDE.md
recurs: [parallel-agents-share-one-index-and-every-generator]
---

# A prototype in the tree the merge was using

## User impact

The operator asked "Energy, what if we add a delay for first change?" A
subagent started a prototype. The operator then said "Merge". The prototype
broke the merge's gate run, was stopped, and was lost with the container.

| | Seen | Expected |
| --- | --- | --- |
| Gate run after merging main, 00:28 | lint exit 1 and 8 failures in `SetlistEntryEnergyField` and `SongEnergyField` tests | the merge's own result |
| After the merge at 00:40 | the prototype in `git stash` and a scratchpad patch, "treat it as lost" | the prototype on a branch, or dropped on purpose |

## Causal chain

- The prototype was lost, and a gate run reported failures that were not the
  merge's.
  - The energy subagent wrote `EnergyMeter.tsx` at 00:23 into the checkout
    where the main session was running the merge's gates.
    - The main session kept the agent running after "Merge" and said "the
      agent hasn't changed any file yet" three minutes before it did.
      - Main had rewritten the energy bar in PR #252 and PR #256, so the
        prototype stood on old code. The main session stopped it with
        `TaskStop`, stashed its two files, and merged.
        - Nothing between the stash and `merge_pull_request` asked where the
          stashed work would go.

## Root cause of occurrence

*Thought a background agent and the main session can share one checkout as
long as the agent does not commit, actually any agent edit lands in the next
gate run, and anything not pushed ends with the container.* CLAUDE.md's
*Parallel agents* section covers the shared index. It says nothing about the
main session running gates while an agent writes, or about merging with work
parked locally.

## Detection failure causes

- **Hooks:** `no-discarding-reset` caught the first attempt to clear the
  prototype, a `git checkout --` of its two files, and named the main session's
  own merge fixes as also at risk. It worked as designed. The stash it pointed
  to was safe only until the container went.
- **Merge:** `merge_pull_request` ran with a non-empty stash, and nothing
  looked.

## Countermeasure

The main session stashed the two prototype files, re-ran the gates on the
merge alone (3,621 tests passed), merged main a second time, and told the
operator the prototype was lost.

## Eradication

**Type:** DevX check (level 2)

**Reference:** the commit that adds this file.

```diff
+      {
+        "matcher": "mcp__github__merge_pull_request",
+        "hooks": [ { "type": "command",
+          "command": "\"${CLAUDE_PLUGIN_ROOT}\"/hooks/pretool-merge-strands-no-work.sh" } ]
+      }
```

`merge-strands-no-work` refuses `merge_pull_request` while the checkout holds
tracked changes or stash entries. It names the two ways out: push the work to a
branch, or drop it with the operator's own confirmation. Untracked files do
not count, since build output and scratch files live there.

A level-1 fix was considered and rejected. Forcing every writing subagent into
`isolation: "worktree"` would remove the shared checkout, but it changes how
every feature subagent works and is an architecture decision for the operator.

**Proof it can fail:** in this sweep's checkout, with its own uncommitted
eradications, the hook printed `[merge-strands-no-work] this container holds
work no branch has, and it is reclaimed after the merge:` and listed the files.
On a clean checkout with an empty stash it exits 0.

**Similar instances:** `parallel-agents-share-one-index-and-every-generator`
is the same shared checkout seen through `git add -A`. The Stop hook nagged
three times in PR #249 about files the migration subagent owned, the same
cause again.
