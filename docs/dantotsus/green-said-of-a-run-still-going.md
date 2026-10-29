---
date: 2026-10-29
introduced-at: code-review
detected-at: operator-deploy
severity: medium
related-pr: '#206'
fix-pr: none (the kaizen pull request for PR #206 that adds this file)
fix-commits: [self]
eradication-level: 4
eradication-paths: [plugins/borso-harness/hooks/posttool-empty-checks-means-conflict.sh, plugins/borso-harness/scripts/check-hook-decisions.sh]
time-to-detect: minutes
tags: [ci, github-actions, orchestrator, agents, hooks]
zone: plugins/borso-harness/hooks/posttool-empty-checks-means-conflict.sh
weak-point: prose-stands-in-for-a-check
recurs: [one-sample-could-not-tell-the-hook-from-the-runner]
---

# Green, said of a run that was still going

## Symptom

During PR #206 the orchestrating session told the operator twice that CI said
something CI had not said.

- It called the pull request's CI green while a job was still running: the
  runs that had finished were green, and the sentence covered all of them.
- It told the operator that "the CI check re-runs once" after a failure.
  No workflow in this repository re-runs a job on its own. `app-tests (pragma)`
  was cancelled at its ten-minute limit twice on the branch (run
  `40801563077` on `f4591576` ended cancelled on its third attempt).

Both reached the operator as facts, and the operator had to find out from
GitHub that they were not.

## Root-cause chain

1. **Why was a running job reported as green?** The answer was built from a
   `get_check_runs` read, and the reader summarised the conclusions it saw.
   A run in progress has no conclusion, so it contributes nothing to a
   summary of conclusions: it is not red, and it reads as absent.
2. **Why did nothing in the read point at it?** The MCP answer is a flat list
   of runs. Nothing in it says "not finished", and with a page size the list
   holds a few runs of a `total_count` it states in the same answer, which is
   the same trap in another form: every run on the page passed.
3. **Why was a re-run mechanism described that does not exist?** The sentence
   explained a flaky cancellation with a mechanism that would have made it
   harmless. No file was read to support it; a re-run is something CI
   systems often have, so it sounded true.
4. **Why did the earlier eradication not cover this?** PR #197's sweep found a
   subagent that said "nothing is failing" before CI had run, and the
   countermeasure was a line printed by `pre-push`
   ([one-sample-could-not-tell-the-hook-from-the-runner](./one-sample-could-not-tell-the-hook-from-the-runner.md)).
   That line reaches whoever pushes. The orchestrator here had not pushed; it
   read the checks afterwards, and the read had no guard of its own.

**Root cause:** thought a list of check runs with no failure in it was a green
CI, actually a run in progress has no conclusion and a paged list omits runs,
so "no failure seen" and "every run passed" are different statements.

## Detection failure causes

- **Linter / static analysis:** not applicable; the defect is a sentence.
- **Hooks:** `posttool-empty-checks-means-conflict.sh` already read every
  `get_check_runs` answer, and spoke only when the list was empty. A list
  with a run still going, or a page shorter than its total, passed it silently.
- **Code review:** the claims went to the operator in chat, where no reviewer
  reads them before they are acted on.
- **CLAUDE.md:** *Verify before asserting* covers both sentences and did not
  stop either; it is a rule the writer has to remember at the moment of
  writing, which is the moment this failure happens.

## Countermeasure

The operator checked GitHub, and the orchestrator corrected both statements.

## Eradication (mandatory — code-level)

**Type:** detection (level 4)

**Reference:** the commit that adds this file.

**The actual fix:** the hook that reads every `get_check_runs` answer now also
speaks when the answer is not a verdict yet. It names each run whose `status`
is not `completed`, and, when the page holds fewer runs than `total_count`,
says how many were left out. It answers through `additionalContext`, at the
moment the summary is formed:

```diff
-TOTAL=$(jq -r '… | .total_count // empty' <<<"$RESPONSE" 2>/dev/null)
-[ "$TOTAL" = "0" ] || exit 0
+if [ "$TOTAL" != "0" ]; then
+  [ "$METHOD" = get_check_runs ] || exit 0
+  SHOWN=$(jq -r '.check_runs | length' <<<"$PARSED")
+  RUNNING=$(jq -r '[.check_runs[] | select(.status != "completed") | .name] | join(", ")' <<<"$PARSED")
+  [ -z "$RUNNING" ] && [ "$SHOWN" -ge "${TOTAL:-0}" ] && exit 0
+  NOTE="[unfinished-checks] get_check_runs for pull request $PR is not a verdict yet."
```

`check-hook-decisions.sh` holds the new behaviour with four cases: a run in
progress is named, a page of 1 of 29 is named, a finished whole list stays
silent, and `get_status` stays silent.

The re-run sentence has no code-level guard: no hook can tell an invented
mechanism from a real one. It is recorded here so the next sweep that meets
it counts a second occurrence rather than a first.

**Sibling defects swept:** `get_status` answers `pending` for the same
situation and was already left to the empty-list branch; it stays silent here
because its `pending` state already says the thing this hook adds.

## See also

- [one-sample-could-not-tell-the-hook-from-the-runner](./one-sample-could-not-tell-the-hook-from-the-runner.md), "nothing is failing" before CI ran.
- [`docs/knowledge/a-conflicted-pull-request-gets-no-checks.md`](../knowledge/a-conflicted-pull-request-gets-no-checks.md), the empty-list half of the same hook.
