---
date: 2026-11-05
introduced-at: code-review
detected-at: operator-deploy
severity: low
related-pr: '#274'
fix-pr: none (opened by the kaizen pull request for #274)
fix-commits: [self]
eradication-level: 2
eradication-paths: [.claude/hooks/pretool-merge-deploys-prod.sh]
time-to-detect: minutes
tags: [hooks, harness, deploy, ci, github-actions]
zone: .claude/hooks/pretool-merge-deploys-prod.sh
recurs: [two-merges-sixteen-seconds-apart-one-untested-main, the-merge-whose-blast-radius-nobody-printed]
---

# A warning that arrives with the merge

## User impact

The operator said "merge it" on PR #274. The session merged. Only then did it
read the hook's notice that `main` had moved after CI started, which ended
with "Tell the operator before merging". The operator heard about the
untested combination after production deploys had started.

| | Seen | Expected |
| --- | --- | --- |
| Merge of #274 | Merged on a base two commits newer than its CI, then told | Told, or made to test the combination, before the merge ran |

Nothing broke. `main`'s own run on `6250f706a` passed its app tests
(measured, `gh api .../check-runs` on that commit).

## Causal chain

- The operator learned of an untested merge after it ran
  - The session acted on the notice only after the merge call returned
    - The notice travels as `additionalContext`, which the session reads beside the tool's result
      - `pretool-merge-deploys-prod.sh` always exits 0, so its "before merging" instruction rides a channel that arrives after

## Root cause of occurrence

*Thought a PreToolUse notice is read before the call runs, actually it is
read with the call's result.* The hook's own header says the notice "goes
back as `additionalContext`" and that it "never blocks a merge". A sentence
telling the reader to do something before the call cannot be followed from
there.

## Detection failure causes

- **Hook design:** the moved-base check from
  [`two-merges-sixteen-seconds-apart-one-untested-main`](./two-merges-sixteen-seconds-apart-one-untested-main.md)
  stopped at detection (level 4) and assumed the reader could still act.
- **Proof:** that sweep proved the check prints, not that its reader could
  stop the merge.

## Countermeasure

The hook now exits 2 when `main` moved after CI started *and* a commit since
then changes a file this branch changes. It names the reversible step: merge
`main` in, push, wait for the `check_suite` event. That step needs no
operator, so it is not the confirmation CLAUDE.md rules out. When no file
overlaps, the merge goes through, and the notice says it has already run and
points at `main`'s own CI run instead of asking for something already too late.

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit `[self]` on the kaizen branch for PR #274

```diff
+      if [ -n "$BOTH" ]; then
+        { echo "[merge-on-moved-base] refused: $BASE_BRANCH moved after this pull request's CI started ($CI_STARTED),"
+          ...
+          echo "[merge-on-moved-base] Merge $BASE_BRANCH into the branch, push, wait for the check_suite event, then merge."
+        } >&2
+        exit 2
+      fi
```

**Proof it can fail:** fed `{"tool_input":{"owner":"hugoleborso","repo":"borso.fr","pullNumber":257}}`
with `KAIZEN_LOG_REFUSALS=0`, the hook exits 2 and prints
`[merge-on-moved-base] refused: main moved after this pull request's CI started (2026-11-04T00:32:19Z),`.
Fed PR #274, it exits 0 with the rewritten notice, since no file overlaps.

**Similar instances:** `grep -n 'before merging\|before you' .claude/hooks/pretool-*.sh`
found no other PreToolUse hook that asks for an action before its own call
while exiting 0.
