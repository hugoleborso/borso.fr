---
date: 2026-11-12
introduced-at: conception
detected-at: local
severity: medium
related-pr: '#298'
fix-pr: none (the kaizen pull request for PRs #293 and #298 that adds this file)
fix-commits: none (proposal under review)
eradication-level: 5
eradication-paths: []
time-to-detect: hours
tags: [hooks, harness, validation, preview, gates]
zone: .claude/hooks/pretool-api-change-needs-validation.sh
recurs: none (the first entry on the api-validation gate; the-validator-opened-a-checkout-holding-only-the-plan shares three tags and is about what a validator reads, not about when it runs)
---

# The review spent to buy a preview

Status: a proposal. The operator chooses the countermeasure, and no code has changed.

## User impact

The operator merged PR #298 on a FAIL verdict, with two fixes no review had
read. Counted on the three reports under
`docs/features/pragma/cold-start-sweep/validation/` and on the commit list.

| | Seen | Expected |
| --- | --- | --- |
| Round 1, 20:17 UTC | It read two changed lines of code, one lever of the spec's five, and failed on 9 blocking findings that each said a lever was not shipped yet | A review of the finished change |
| Round 2, 23:28 UTC | The first read of the three other levers. It failed on 2 blocking findings | The confirmation of round 1's fixes |
| Merge, 00:19 UTC | Both findings fixed after round 2, "with no third round to confirm" (the pull request body) | A PASS on the code that merged |

## Causal chain

- PR #298 merged with FAIL as its last verdict.
  - No round was left to read the two fix commits. A branch gets two.
    - Round 1 had been spent at 20:17 UTC on a diff of two lines.
      - The session ran it to open the pull request, not to review the work.
        The log says so: "technical validation was run on a one-line diff only
        so the api-validation hook would let the pull request open".
        - The hook refused `create_pull_request` at 20:08 UTC. The diff touched
          `apps/pragma/api/` and held no report.
        - The session needed the pull request before the work existed. A
          preview deploys for a pull request only, and each lever was measured
          on the preview.
          - The hook asked for the report when the pull request is created:

```sh
HEAD_BRANCH="$(jq -r '.tool_input.head // empty' <<<"$INPUT")"
if [[ -z "$HEAD_BRANCH" ]]; then
  COMMAND="$(jq -r '.tool_input.command // ""' <<<"$INPUT")"
  ...
  grep -qE '...gh[[:space:]]+pr[[:space:]]+create\b' <<<"$COMMAND" || exit 0
```

## Root cause of occurrence

*Thought a pull request opens once the change is done, so the moment it opens
is the moment a review can exist. Actually a pull request is also the only way
to get a preview, and work that is measured on a preview needs it first.*

`CLAUDE.md` states the belief: "Once a change is done, front-end above all,
open its pull request without asking." `.github/workflows/preview.yml` states
the fact. Its only trigger is:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
```

## Detection failure causes

- **Local, when the hook was written:** the sweep of PR #274 proved the hook on
  one case, a finished branch with no report. No case had a branch that needs
  its preview before its report can mean anything.
- **Review, round 1:** the validator graded the four missing levers blocking,
  as its procedure says. It reads the spec and the diff, and nothing told it
  the work had not started (its log line of 20:17 UTC).
- **The round budget:** `/technical-validation` allows two rounds and no third,
  so a round spent early cannot be bought back.

## Countermeasure

Not chosen. The operator decides when an API change may reach a preview, so
the options are side by side.

| Option | What a session does on work like PR #298 | What it costs |
| --- | --- | --- |
| Keep the gate where it is | It opens the pull request only with a report, so it reviews unfinished code or measures another way | A round is spent early again, or the preview stops being the instrument |
| Ask for the report at the merge | It opens the pull request freely, measures, and runs the review once the work is done | API code reaches a preview before any review. A merge the operator makes in GitHub meets no hook |
| Let through a pull request whose body says `Preview first: <reason>`, and ask for the report at the merge | The same as above, and the operator reads in the body that no review exists yet | The same, for the pull requests that say so, and two hooks to keep |

A first version of this entry let a draft pull request open without a report
and asked for the report when it was marked ready. The operator refused it on
2026-11-12: a draft is not to deploy its preview. Today it does. PR #310 was a
draft for one minute, and its five `deploy (<app>)` jobs started 18 seconds
after it opened (measured on its check runs). `preview.yml` holds no condition
on `draft`.

## Eradication

**Type:** knowledge (level 5), until the operator chooses.

**Reference:** none yet. The hook is as it was on `main`.

**Proof it can fail:** none, since nothing was added.

**Similar instances:** `.claude/settings.json` registers two other hooks on
`mcp__github__create_pull_request`. `pretool-one-pull-request-per-session.sh`
reads the base and the session. `pretool-github-pr-body.sh` reads the body's
markup. Neither asks for finished work, so neither stands between a session
and its preview.
