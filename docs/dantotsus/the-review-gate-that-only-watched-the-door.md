---
date: 2026-11-15
introduced-at: code-review
detected-at: review
severity: medium
related-pr: '#354'
fix-commits: [self]
eradication-level: 5
eradication-paths: [.husky/pre-push]
time-to-detect: hours
tags: [hooks, validation, pragma, gates]
zone: scripts/hooks/checks/api-change-needs-validation.core.ts
weak-point: gate-measures-nothing
recurs: [the-sweep-that-decided-how-the-operator-works]
---

# The review gate that only watched the door

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
  - The only check that asks for the report ran when the pull request opened.
    - The pull request opened at 06:47 on the improvements filter, a site-only
      change that carried its visual-validation report, so the check passed.
      - The presence API (`d31dd98`, 07:08), band links (`36ef284`, 09:19) and
        the Deezer preview route (`edc7e00`, 09:42) were then pushed to the
        open pull request.
        - The check, added in `572a62640` (the sweep of PR #274), fires on
          `mcp__github__create_pull_request` and `gh pr create` only. Today's
          `api-change-needs-validation.core.ts:52` keeps that trigger:

          ```ts
          tools: /^(Bash|mcp__github__create_pull_request)$/u, // a push to an open pull request is never read
          ```

          - `CLAUDE.md` asks to open a front-end pull request as soon as it
            is done, so that the preview validates it ("Once a change is
            done, front-end above all, open its pull request without
            asking."). A batch keeps growing after that first opening
            (Method).

## Root cause of occurrence

*Thought the pull request's diff at opening is the diff that merges, actually
under the open-early flow a batch keeps growing on an open pull request.*
(Method)

`.claude/hooks/pretool-api-change-needs-validation.sh`, read when this entry
was written, said it refuses "to open a pull request whose diff against main
touches apps/<app>/api/ unless the same diff adds a technical-validation
report". The flow its author followed puts the opening before the batch is
done, so a gate at the opening sees only the first piece.

## Detection failure causes

- **Hook:** it watches the opening alone, as its own header says.
- **Merge hook:** `pretool-merge-deploys-prod.sh`, now `merge-deploys-prod.core.ts`, reads the merging diff but
  checks only CI and the moved base. The operator refused a review check at
  the merge on PR #310, because committing the report then re-runs CI («  ça
  fait [...] tu rejoues plein de fois la CI »), see
  [`the-sweep-that-decided-how-the-operator-works`](the-sweep-that-decided-how-the-operator-works.md).

## Countermeasure

The kaizen sweep built a merge-time refusal, proved it refuses PR #354's head
(`[merge-unreviewed] refused: pull request 354 lacks a technical-validation
report, for 68 file(s) under apps/*/api/`), then removed it unshipped, because
it is the mechanism refused on PR #310. It then asked the operator to choose:

| Option | What changes day to day | Cost |
| --- | --- | --- |
| A. Keep the check at opening only | Nothing. A batch that gains an API after opening merges unreviewed | No new CI run |
| B. A pre-push notice | A push that brings API files to a branch with no technical report prints that the review is owed. Nothing is refused | No extra CI run when the report rides with the last push |
| C. A refusal at the merge | A merge an agent runs is refused until the report is on the branch | One more CI run per pull request whose report comes last |

The operator picked B on 2026-11-15 (« B of course »).

## Eradication

**Type:** knowledge (level 5). A notice that prints and exits 0, by the
operator's choice. It detects nothing a merge has to answer, so it sits below
the detection rung.

**Reference:** the commit adding this file. The notice is at
`.husky/pre-push:378-380` today.

```diff
+    branch_changes=$(git diff --name-only origin/main...HEAD 2>/dev/null || true)
+    api_changes=$(printf '%s\n' "$branch_changes" | grep -cE '^apps/[^/]+/api/' || true)
+    if [ "$api_changes" -gt 0 ] && ! printf '%s\n' "$branch_changes" | grep -qE '^docs/features/[^/]+/[^/]+/validation/technical-validation-[^/]+\.md$'; then
+      printf '⚠️  [pre-push] this branch changes %s file(s) under apps/*/api/ and carries no technical-validation report.\n' "$api_changes" >&2
```

**Proof it can fail:** on a `claude/` branch at PR #354's head, the block
printed `this branch changes 68 file(s) under apps/*/api/ and carries no
technical-validation report`. On the kaizen branch, which touches no API, it
printed nothing.

**Similar instances:** `grep -ln 'create_pull_request\|isRunningPullRequestCreate' scripts/hooks/checks/*.core.ts`
lists the checks that read only the opening. The visual-validation half of the
same check has the same gap, and was left as it is, since the operator chose
for API changes. The level stays at 5 because a stronger rung, a refusal at
the merge, is the mechanism the operator weighed and refused.
