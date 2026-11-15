---
date: 2026-11-14
introduced-at: conception
detected-at: local
severity: low
related-pr: none (the round rules predate the move of the harness in #266; the gap bit on #327)
fix-pr: none (lands with the kaizen pull request for PR #327)
fix-commits: [self]
eradication-level: 5
eradication-paths: [.claude/skills/technical-validation/SKILL.md]
time-to-detect: minutes
tags: [validation, skill, process, agents]
zone: .claude/skills/technical-validation/SKILL.md
recurs: none (the first entry on the round count, not on a round's scope)
---

# A revision after a passed review had no round

## User impact

The operator saw nothing. The validator received a brief its own rules
contradicted, and spent its first steps reconciling them.

| | Seen | Expected |
| --- | --- | --- |
| PR #327, third technical validation | the report says `Round: 1 (of the revision; the branch's earlier work passed round 2 at ef529130f)` and reads `git diff ef529130f..HEAD` "as the brief asks" | a round whose name and scope come from one rule |

Measured in
`docs/features/pragma/composition-inspirations/validation/technical-validation-2026-11-14-0015.md`,
lines 6 and 8. The validator logged it as
`[technical-validator-revision] A spec revision after a passed round 2 has no defined round`.

## Causal chain

- The validator had to choose between its brief and its round rules.
  - The brief called the run round 1 and scoped it to `git diff ef529130f..HEAD`.
    - The agent gives that two-dot scope only to round 2, and round 1 always
      reads `<base_ref>...HEAD`.
      - The main session could not name the run by the skill, because step 6
        has no case for it:

```text
6. Pick the round. Round 1 when no earlier technical-validation-*.md report
   of this branch sits in validation_dir; round 2 otherwise, with
   previous_report set to it. There is no round 3.
```

With two reports already present, step 6 says round 2, and round 2 had
already passed. The spec revision after it was new work.

## Root cause of occurrence

*Thought a branch is validated once, in at most two rounds, actually a spec
revision after a pass reopens the branch to new code that no round has read.*

The rule's own source, `.claude/skills/technical-validation/SKILL.md` step 6,
counts reports and has no notion of a pass between them.

## Detection failure causes

- **Local:** the skill is prose, and no tool reads the round a brief names.
  The validator noticed only because the scope it was given matched no round.

## Countermeasure

Step 6 now names the case. A revision after a passing report is a new round 1
whose `base_ref` is that report's `Reviewed:` SHA, and it gets its own round 2.
The agent's existing round-1 rule then reads exactly the revision, through
`<base_ref>...HEAD`, so the agent file needs no change.

## Eradication

**Type:** knowledge (level 5). The fix is a skill edit.

**Reference:** this commit.

```diff
 6. **Pick the round.** ... There is no round 3.
+   A revision after a passing report, such as a spec change, is a new round 1
+   with `base_ref` set to that report's `Reviewed:` SHA, and gets its own
+   round 2.
```

Level 2 was considered and rejected. A hook on the Agent tool could read the
brief's `round` and `base_ref`, but the brief is free text, and the PR #327
brief was already well formed apart from the round's name. The mismatch would
need a parser for the brief to catch it.

**Proof it can fail:** not applicable to a skill edit.

**Similar instances:** `grep -ci round .claude/skills/visual-validation/SKILL.md`
prints 1, a line about a background time limit. `/visual-validation` counts no
rounds, so it has none to reopen.
