---
date: 2026-11-15
introduced-at: code-review
detected-at: review
severity: medium
related-pr: '#354'
fix-commits: none (proposal under review)
eradication-level: 5
eradication-paths: []
time-to-detect: hours
tags: [hooks, validation, pragma, gates]
zone: .claude/hooks/pretool-api-change-needs-validation.sh
weak-point: gate-measures-nothing
recurs: [the-sweep-that-decided-how-the-operator-works]
---

# The review gate that only watched the door

Status: a proposal. The operator picks one option below, and only that one is built.

## User impact

PR #354 merged three migrations and two new API slices with no technical
review. One migration, 0029, drops the production `study` table and its rows.

| | Seen | Expected |
| --- | --- | --- |
| Merge of PR #354, 16:43 UTC | Three visual-validation reports, no technical-validation report (measured, `git diff --name-only e42eda8^ e42eda8`) | A technical review of the 68 changed files under `apps/pragma/api/` before the merge |

The loss is the review itself, which the operator asked for on
API changes on 2026-11-05.

## Causal chain

- PR #354 merged its API changes without a technical review.
  - The only check that asks for the report runs when the pull request opens.
    - The pull request opened at 06:47 on the improvements filter, a site-only
      change that carried its visual-validation report, so the check passed.
      - The presence API (`d31dd98`, 07:08), band links (`36ef284`, 09:19) and
        the Deezer preview route (`edc7e00`, 09:42) were pushed to the open
        pull request afterwards. No hook reads a push.
        - CLAUDE.md asks to open a front-end pull request as soon as it is
          done, so that the preview validates it. A batch that grows after
          that first opening walks past the gate by design.

## Root cause of occurrence

*Thought the pull request's diff at opening is the diff that merges, actually
a batch keeps growing on an open pull request.*

`.claude/hooks/pretool-api-change-needs-validation.sh`, read this session,
says it refuses "to open a pull request whose diff against main touches
apps/<app>/api/ unless the same diff adds a technical-validation report". It
fires on `mcp__github__create_pull_request` and `gh pr create` only.

## Detection failure causes

- **Hook:** it watches the opening alone, as its own header says.
- **Merge hook:** `pretool-merge-deploys-prod.sh` reads the merging diff but
  checks only CI and the moved base. The operator refused a review check at
  the merge on PR #310, because committing the report then re-runs CI («  ça
  fait [...] tu rejoues plein de fois la CI »), see
  [`the-sweep-that-decided-how-the-operator-works`](the-sweep-that-decided-how-the-operator-works.md).
- **Session:** the main session ran `/visual-validation` three times and
  `/technical-validation` never (measured, the merge's validation folders).

## Countermeasure

None shipped. The kaizen sweep built a merge-time refusal, proved it refuses
PR #354's head (`[merge-unreviewed] refused: pull request 354 lacks a
technical-validation report, for 68 file(s) under apps/*/api/`), then removed
it unshipped, because it is the mechanism refused on PR #310.

## Eradication

The options, as the operator would live with them:

| Option | What changes day to day | Cost |
| --- | --- | --- |
| A. Keep the check at opening only | Nothing. A batch that gains an API after opening merges unreviewed, as PR #354 did | No new CI run |
| B. A pre-push notice | A push that brings API files to a branch with no technical report prints one line saying the review is owed before merge. Nothing is refused, so the session can run the review before its last push and the report rides with it | No extra CI run when the session follows it. A session can still ignore it |
| C. A refusal at the merge | A merge an agent runs is refused until the report is on the branch | One more CI run per pull request whose report comes last, the cost refused on PR #310 |

Recommendation: B. It costs no CI run and needs nothing from the operator.

**Similar instances:** `grep -n 'create_pull_request\|gh pr create' .claude/hooks/*.sh`
lists the checks that read only the opening. The visual-validation half of the
same hook has the same gap.
