---
date: 2026-10-25
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#193'
fix-commits: [a83f0a600, c54e32da7]
eradication-level: 5
eradication-paths: [.claude/skills/technical-validation/SKILL.md, .claude/agents/technical-validator.md]
time-to-detect: hours
tags: [standards, review, seals, agents, harness, meta]
zone: .claude/skills/technical-validation
weak-point: prose-stands-in-for-a-check
recurs: [ten-review-rounds-on-a-two-file-bug-fix]
---

# Nine review rounds, each meeting a file for the first time

## User impact

The operator waited on nine standards reviews for one branch, the takes branch
of PR #193. He should have waited on one or two.

| | Seen | Expected |
| --- | --- | --- |
| Review rounds | 9, the first six each returning findings | 1, or 2 with the second on the fix only |
| Findings | 41, of which 22 were older than the branch, arriving a few per round | Each file's findings reported in the round that first reads it |

Measured by the first version of this entry from the review reports. Five
reviewer agents logged the same wall in `KAIZEN.md` (`standards-reviewer`,
`standards-reviewer-2` to `-5`).

## Causal chain

- Each of rounds one to six returned new findings.
  - Each round read whole files it had not read before. `VOCABULARY.md` came
    back round after round with a few more false sentences.
    - Each fix round edited files to close the last round's findings, and the
      next round had to read every edited file in full again.
      - An edited file lost its seal. `seal.core.ts` matched a file to the
        ledger by the hash of its whole content:

        ```ts
        const matching = ledger.filter((entry) => entry.contentHash === file.contentHash);
        if (matching.length === 0) {
          // … reason: wasReviewedBefore ? 'edited-since-it-was-reviewed' : 'never-reviewed'
        ```

        A one-line fix unsealed the whole file (Machine).
        - The seal was written in `a9c72cedd` (2026-08-15) to stop a standard
          claiming enforcement it lacked. It treats a file as the unit of
          review, so the review had no end other than a round with no edit.
    - Fix agents fixed the quoted line only. A second finding three lines below
      survived, and the next round reopened the file for it.
  - Round one's scope was the files the branch had changed so far. The callers,
    types and vocabulary entries a fix would reach were outside it.

## Root cause of occurrence

*Thought a seal per file content keeps review bounded, because each file is
reviewed once, actually every fix edits a file, so every fix reopens a
whole-file review and the rounds grow with the fixes.* (Machine)

`seal.core.ts` at `a83f0a600^`, lines 90 to 98, unseals any file whose content
hash matches no ledger entry, with the reason `edited-since-it-was-reviewed`.
Nothing in the seal or the skill bounded the number of rounds.

## Detection failure causes

- **Linter:** a reviewer checks the residue no rule can see, so no rule could
  flag the rounds.
- **Round count:** nothing in the seal or the skill capped the rounds, so
  nothing stopped round three, or round nine.
- **CI:** `seal.ts verify` was not wired into CI. It said which changed files
  were unsealed, not how many rounds the branch would take.
- **Review labels:** `Introduced` and `Fix size` on each finding, from
  [`ten-review-rounds-on-a-two-file-bug-fix.md`](./ten-review-rounds-on-a-two-file-bug-fix.md),
  labelled a pre-existing finding after it surfaced. They made rounds legible
  without shrinking them.
- **First seals:** the pipeline's ship agent (`open-pr-01`) took them inline,
  because it had no Agent tool to dispatch the isolated reviewer
  ([`the-validator-opened-a-checkout-holding-only-the-plan.md`](./the-validator-opened-a-checkout-holding-only-the-plan.md)).
  It sealed 68 files, several carrying findings the isolated review found
  shortly after.

## Countermeasure

Commit `a83f0a600` added `seal.ts scope --base <ref> --plan <plan.md>`, which
listed the changed files plus every file the plan names as round one's scope.
The reviewer brief then required every finding in a file to be reported in the
round that reads it. On the takes plan it listed 115 files against the 76
round one had reviewed.

## Eradication

**Type:** knowledge (level 5). The cause was subtracted, and what bounds the
rounds today is an agent prompt.

**Reference:** commit [`c54e32da7`](https://github.com/hugoleborso/borso.fr/commit/c54e32da7)
(2026-10-29) deleted the seal, `seal.ts scope` and the separate standards
review. `ls scripts/standards | grep seal` is empty. The standards checklist
moved into `/technical-validation`. The ledger that unsealed an edited file no
longer exists, so a fix no longer reopens a whole file.

`.claude/agents/technical-validator.md` holds the replacement:

```text
A branch gets two rounds at most. Before reading anything, record `git rev-parse HEAD` as `Reviewed: <sha>`, which the next round diffs from.
- **Round 2** reviews only `git diff <reviewed-sha>..HEAD` …
```

`.claude/skills/technical-validation/SKILL.md` step 6 adds "There is no round
3." Both are prompts. Nothing refuses a third round.

**Proposed:** a PreToolUse check on the `Agent` call with `subagent_type:
technical-validator`, beside the checks in `scripts/hooks/checks/`. It reads
the feature's `validation/` folder with git and refuses the dispatch when it
already holds two `technical-validation-*.md` reports of the branch since its
last passing one. A third round could then not start without the operator.
`validation-runs-as-its-agent.core.ts` cannot hold it as it stands: it matches
only the `Skill` tool and passes the main session.

**Proof it can fail:** not tried. The proposal is not built.

**Similar instances:** `grep -ril 'round' docs/dantotsus/ | xargs grep -il 'review'`
finds [`ten-review-rounds-on-a-two-file-bug-fix.md`](./ten-review-rounds-on-a-two-file-bug-fix.md),
the earlier entry on the same class.
