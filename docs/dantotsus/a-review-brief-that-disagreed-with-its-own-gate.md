---
date: 2026-08-20
introduced-at: implementation
detected-at: review
severity: medium
related-pr: '#64'
fix-commits: [de7a3458dc]
eradication-level: 5
eradication-paths: [.claude/agents/technical-validator.md, .claude/skills/technical-validation/SKILL.md]
time-to-detect: hours
tags: [skill, standards, gates, harness, meta]
zone: .claude/skills/technical-validation
weak-point: prose-stands-in-for-a-check
---

# The brief said four files, the gate said five

## User impact

Two of the five standards-review passes on one branch were briefed with a list
of files to review. Both lists were short by a file that had changed since the
brief was written. Both agents logged it:

> the dispatching brief named four unsealed files and seal.ts verify named
> five, so an agent that trusts its brief over the gate silently skips a file

> the fifth standards-review pass on this branch was again briefed with fewer
> files than seal.ts verify reports, so the brief and the gate disagree by
> default and only the gate is right

| | Seen | Expected |
| --- | --- | --- |
| The brief of two passes | four files | the five files `seal.ts verify` named when the agent ran |

Both agents ran the gate anyway and reviewed all five. An agent that had
followed its brief would have left a file unsealed while its report said the
branch was reviewed. The seal was what CI gated on.

## Causal chain

- A review agent received a brief naming four files while five needed review.
  - A commit landed between the brief and the agent's run of the gate. The
    agent ran six to nine minutes after the brief was written, and a commit
    landed in that window twice on this branch.
    - The dispatcher had pasted `seal.ts verify`'s output into the brief.
      - The standards-review skill told the dispatcher to run `seal.ts verify`
        first, to learn whether there was a review to run. Its output was a
        list of files.
      - The skill said the brief carries "exactly these fields" and listed
        three (`standards-review/SKILL.md` at `de7a345^`, line 44). The
        dispatcher had that rule loaded and added a fourth.

## Root cause of occurrence

*Thought a file list in the brief helps the agent aim, actually it is a
snapshot of a moving tree that competes with a gate reading the tree live.*

- **Method**, first branch. The dispatch process had the dispatcher compute the
  review's state and hand it over, instead of letting the agent read it at its
  start.
- **Man**, second branch. The rule "exactly these fields" was in the
  dispatcher's context, and the prior to paste helpful state won over it. That
  is why the 2026-08-20 countermeasure, one more sentence in the same skill, was
  the wrong rung, and why the proposal below removes the state fields instead of
  adding a rule.

## Detection failure causes

- **Linter:** the brief is prose in a tool call, and nothing read it.
- **CI:** `seal.ts verify` in CI would have caught an unsealed file after the
  fact, at the merge.
- **Review:** the reviewers were the agents that were mis-briefed.

## Countermeasure

The standards-review skill said that the brief carries its three fields and no
file list, and that the agent runs `seal.ts verify` itself. Both passes had
already self-corrected by running the gate.

## Eradication

**Type:** knowledge (level 5).

**Reference:** commit [`de7a345`](https://github.com/hugoleborso/borso.fr/commit/de7a3458dc)
shipped the skill sentence. Commit `c54e32d` (#224, 2026-10-29) deleted the seal
and the standards-review skill. The standards checklist moved into
`/technical-validation`.

What holds today: `.claude/agents/technical-validator.md` records
`Reviewed: <sha>` before reading anything and computes its own file list from
`git diff <base_ref>...HEAD --name-status`. No brief carries files.

**Proof it can fail:** not applicable to a skill or agent edit.

**Similar instances:** the belief survives in the successor.
`.claude/skills/technical-validation/SKILL.md` steps 4 and 6 still have the
dispatcher compute `base_ref`, `round` and `previous_report` and paste them into
the brief. [`a-revision-after-a-passed-review-had-no-round`](./a-revision-after-a-passed-review-had-no-round.md)
is that snapshot going wrong on PR #327.

**Proposed:** have the validator derive its round and base from the tree, and
drop those fields from the brief. The validator already writes `Reviewed: <sha>`
and a verdict in every report under `validation_dir`. No report means round 1 on
the merge base. A last FAIL means round 2 on that report's SHA. A last PASS means
a new round 1 on that SHA. Step 6 and the three fields then disappear, and no
dispatcher can hand the agent a stale or wrong state.
