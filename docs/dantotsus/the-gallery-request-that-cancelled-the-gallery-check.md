---
date: 2026-11-14
introduced-at: implementation
detected-at: ci
severity: low
related-pr: '#211'
fix-commits: [self]
eradication-level: 1
eradication-paths: [.github/workflows/screenshots.yml]
time-to-detect: minutes
tags: [ci, github-actions, visual-validation, preview]
zone: .github/workflows/screenshots.yml
recurs: none (the first entry on a concurrency group shared by two triggers)
---

# The gallery request that cancelled the gallery check

## User impact

The operator opened a fresh pull request and saw it marked unstable, with a
cancelled check, until someone re-ran it.

| | Seen | Expected |
| --- | --- | --- |
| PR #327, run 43526307152 | attempt 1 of `screenshots / gallery` cancelled at 23:20:18, re-run as attempt 2 | one green run |
| PR #321, run 43424269452 | `screenshots / gallery` cancelled at 12:20:10, never re-run | one green run |

Measured with `gh api repos/{owner}/{repo}/actions/runs/<id>/attempts/1`.
Each cancellation came five seconds or less after a `workflow_dispatch` run
of the same workflow (43526336947 at 23:20:13, 43424271464 at 12:20:07).

## Causal chain

- The pull request showed a cancelled `screenshots / gallery` check.
  - GitHub cancelled the `pull_request` run that the pull request's opening started.
    - `/open-pr` step 5b dispatched `screenshots.yml` a few seconds later, and
      the dispatch landed in the same concurrency group.
      - Both triggers resolve the group to `screenshots-<n>`, and the group
        cancels whatever is running:

```yaml
concurrency:
  group: screenshots-${{ inputs.pr || github.event.pull_request.number }}
  cancel-in-progress: true
```

        - Commit `2e393f99c` (#211) added the `workflow_dispatch` trigger and
          shared the group on purpose, so the two runs never write the sticky
          comment at once. It kept `cancel-in-progress: true` for both
          triggers.

## Root cause of occurrence

*Thought a dispatch run only replaces a stale copy of itself, actually it
cancels any run in its group, including the pull request's own check, which
the dispatch does not replace on the pull request.* (Man)

The agent that wrote #211 applied its prior about `cancel-in-progress`. The
same commit shares the group on purpose, so it knew both triggers met there.
The gap was what the flag cancels. Whether the concurrency page was in its
context is unknown, so Man rests on the prior winning (inferred).

[GitHub's documentation on concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency),
read this session: "To also cancel any currently running job or workflow in
the same concurrency group, specify `cancel-in-progress: true`. To
conditionally cancel currently running jobs or workflows in the same
concurrency group, you can specify `cancel-in-progress` as an expression."
The dispatch runs on `main`, so its result is not a check of the pull
request's head, and the cancelled run is the one the pull request shows.

## Detection failure causes

- **CI:** a cancelled run is not a failure, so no required gate turned red.
  The pull request reads "unstable", which looks like a flaky runner.
- **Review:** PR #211 tested the dispatch and the push trigger one at a time.
  The race needs both within one run's lifetime, which only `/open-pr`'s
  sequence produces.

## Countermeasure

`cancel-in-progress` is true only for a `pull_request` run. A newer push still
cancels an older run, and a dispatch now queues behind the running
`pull_request` run instead of cancelling it. The group stays shared, so the
two runs never write the *Screenshots* comment at the same moment, and the
sticky comment is never created twice.

## Eradication

**Type:** structural impossibility (level 1). A dispatch evaluates
`cancel-in-progress` to false, so it cannot cancel a running check.

**Reference:** this commit.

```diff
 concurrency:
   group: screenshots-${{ inputs.pr || github.event.pull_request.number }}
-  cancel-in-progress: true
+  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

**Proof it can fail:** `actionlint .github/workflows/screenshots.yml` passes.
The before state is the two cancelled runs above (measured). The after state
needs a real dispatch on a pull request, which this session cannot start
without opening one, so it is unverified until the kaizen pull request runs
`/open-pr` (labelled guess until then).

**What stays possible:** the same page says "any existing `pending` job or
workflow in the same concurrency group will be canceled and the new queued job
or workflow will take its place." A dispatch that arrives while a push run is running and
a second push run is waiting replaces the waiting one. `/open-pr` dispatches
right after the pull request opens, when only one run exists (inferred from
the two incidents above).

**Similar instances:** `grep -n -A2 '^concurrency' .github/workflows/*.yml`.
`architecture.yml` shares one group between `workflow_dispatch` and
`pull_request: closed`, and there the cancellation is wanted: the teardown of
a closed pull request supersedes a map build for it.
