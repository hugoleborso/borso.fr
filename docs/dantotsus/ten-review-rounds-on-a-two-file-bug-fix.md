---
date: 2026-08-21
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#84'
fix-commits: [77473535c1, 2672da66f9, c54e32da7]
eradication-level: 5
eradication-paths: [.claude/skills/technical-validation/SKILL.md, .claude/agents/technical-validator.md]
time-to-detect: hours
tags: [standards, review, seals, meta]
zone: .claude/skills/technical-validation
---

# Ten review rounds on a two-file bug fix

## User impact

The operator reported one bug, an instrument delete that did not look optimistic. He got back a draft pull request he could not decide on.

| | Seen | Expected |
| --- | --- | --- |
| PR #84 | 59 files, 13 commits, ten rounds of standards review. By round five the findings were an edition delete that orphaned its roster, punch writes with no transaction, a hand-written row type and an error class in the wrong layer. | A two-file fix of the optimistic delete, and a clear choice about any older defect the review found |

Nine rounds returned findings and every finding was real (measured from the round reports). Two were data-integrity bugs a user would hit. The operator asked halfway: *"Pourquoi c'est en draft ?"* ("Why is it still a draft?").

## Causal chain

- The operator saw ten rounds and could not tell when they would stop.
  - Each round's fix pulled files into the diff that no earlier round had reviewed.
    - The seal gate reviewed a file in full the first time anything brought it into a diff, so each new file brought its whole history.
    - Round four moved a projection to a shared `domain/` folder. That put `edition.service.ts` in the diff. Its cascade fix then put the punch and runner slices in the diff.
  - Each report gave every finding the same weight. None said whether the branch had written the line, or how large the fix was.
    - The reviewer's report contract asked for path, bullet, quoted line and remedy, all about the finding and nothing about its link to the change under review (Method).

## Root cause of occurrence

*Thought a review that reports only real findings is working correctly. Actually a real finding on code the branch never wrote is a scope decision, and a report that does not mark it as one leaves the operator no way to decide except to keep going.* (Method)

Source: the report format of `.claude/agents/standards-reviewer.md` before `7747353`, which had no field relating a finding to the diff. Round nine's brief asked for that relation ad hoc, and the round-ten decision then took one reading.

## Detection failure causes

- **The seal gate:** it worked as designed. It had no notion of a branch's scope, only of a file's content.
- **The reports:** each was correct alone. The missing fact was about the change, not the code, so care per report could not produce it.
- **`seal.ts verify`:** it printed its file list only on failure, and said `unsealed` both for a first review and for a re-review after an edit. Four of the ten rounds logged friction about it. The reviewer grepped `seals.jsonl` by hand to tell them apart.
- **The operator's question at round four:** the answer came round by round, because that was the only shape the information had.

## Countermeasure

Round nine's brief asked the reviewer to say, for each finding, whether the branch introduced it and how large the fix was. The round-ten report did, and the operator decided from it at once. `7747353` and `2672da6` made that permanent in the report contract and in `seal.ts verify`'s output.

## Eradication

**Type:** knowledge (level 5)

**Reference:** commits [`7747353`](https://github.com/hugoleborso/borso.fr/commit/77473535c1), [`2672da6`](https://github.com/hugoleborso/borso.fr/commit/2672da66f9), then [`c54e32d`](https://github.com/hugoleborso/borso.fr/commit/c54e32da7) (#224).

The seal, `seal.ts` and the separate standards reviewer were removed on 2026-10-29 in `c54e32d`. The standards checklist moved into `/technical-validation`. Two things hold today.

- The report contract. `.claude/agents/technical-validator.md:78` asks each standards finding for `Introduced: <this branch | pre-existing>` and `Fix size: <one line | one file | N call sites>`. That makes the scope decision legible from round one.
- The round bound. `.claude/skills/technical-validation/SKILL.md`, step 6 and *Findings and rounds*, allows two rounds, the second reading only the diff since the reviewed SHA. "There is no round 3."

```diff
+6. **Pick the round.** Round 1 when no earlier `technical-validation-*.md`
+   report of this branch sits in that folder; round 2 otherwise, with
+   `previous_report` set to it. There is no round 3.
```

The bound is what makes ten rounds impossible. The contract lines only make them readable. Both are written instructions to the session and the validator, and no gate counts rounds. That is why the level is 5. The bound still removes the compounding this entry describes, because round 2 never reopens a file its diff did not touch.

**Proof it can fail:** not tried. A written rule has no refusal to paste, which is the gap the level records.

**Similar instances:** `grep -rn "Introduced:" .claude/` finds the contract only in `technical-validator.md`. The other review agent, `.claude/agents/dantotsu-reviewer.md`, judges finished entries and has no scope to mark. [`the-blueprint-that-mandated-the-refetch-that-undid-it.md`](./the-blueprint-that-mandated-the-refetch-that-undid-it.md) is the defect that started the branch.
