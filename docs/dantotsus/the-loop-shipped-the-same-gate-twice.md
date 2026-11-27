---
date: 2026-09-16
introduced-at: self-validation
detected-at: review
severity: medium
related-pr: '#105'
fix-commits: [4154b33a23]
eradication-level: 5
eradication-paths: [scripts/check-numbered-sequences.sh]
time-to-detect: hours
tags: [gates, pre-commit, ci, meta, self-improvement-loop, shell]
zone: .claude/skills/after-task-kaizen
recurs: [two-branches-that-both-claimed-migration-0006]
---

# The loop shipped the same gate twice, a day apart, and both ran

## User impact

Every commit in the repository printed the same migration-number check twice,
under two names, and paid for both. Agents and the operator reading a gate's
name could not tell which script was the rule, because two standards each
cited a different one.

| | Seen | Expected |
| --- | --- | --- |
| `scripts/` on 2026-09-16 | `check-migration-numbering.sh` and `check-migration-numbers.sh`, both running `find … \| sed … \| sort \| uniq -d` over `apps/*/api/src/database/migrations`, both in `.husky/pre-commit` | One gate for one subject |
| The standards | `11-database.md` named `check-migration-numbers.sh`. `12-linting-and-gates.md` named `check-migration-numbering.sh`. Neither named the other | One script, cited by both |

## Causal chain

- Every commit ran two gates for one subject.
  - Commit `948204d50` (2026-09-16 10:34) shipped
    `check-migration-numbering.sh` as the eradication of
    [`two-branches-took-the-same-migration-number`](./two-branches-took-the-same-migration-number.md)
    (PR #102).
  - Eight hours later, commit `60fcd964e` (2026-09-16 18:37, PR #105 sweep)
    shipped `check-migration-numbers.sh` as the eradication of
    [`two-branches-that-both-claimed-migration-0006`](./two-branches-that-both-claimed-migration-0006.md).
    - The second sweep classified its friction line "two migrations claimed
      0006" as new. Its inventory step cross-checked each line "against the
      corpus", `docs/dantotsus/` and `docs/knowledge/`, and never looked in
      `scripts/` or the hook list (measured,
      `git show 60fcd964e^:.claude/skills/after-task-dantotsus/SKILL.md`,
      line 61: "`no-op: already eradicated by <existing entry>` once
      cross-checked against the corpus").
      - Its search used the words of its own PR. The first entry is titled
        *Two branches took the same migration number*, so a search for
        "claimed 0006" did not reach it.

## Root cause of occurrence

*Thought the corpus is the record of what has been fixed. Actually it is the
record of what has been written about, in each sweep's own words, and the
fixes live in `scripts/` and the hook list.* (Method)

The sweep skill defined the inventory as a check against the corpus, so the
agent followed the method as written. The two diverge whenever one defect is
described twice in different words, which is the normal case, because each
sweep names the defect after the pull request it swept.

## Detection failure causes

- **Linter:** nothing lints `scripts/*.sh` for behaviour, and no tool decides
  that two shell programs compute the same answer.
- **Local validation:** both gates passed. A duplicated gate agrees with
  itself, so it looks like two gates that agree.
- **CI:** `ci.yml` ran one of the two and pre-commit ran both. Everything was
  green.
- **Pre-commit:** a hook is a list of commands, read in order, never as a set
  of subjects.
- **Review:** the second gate arrived beside three others in a sweep PR. The
  pair shows in a folder listing, never in a diff.
- **The enforcement ledger:** it asked whether each script existed and whether
  a standard explained it. Both did.

## Countermeasure

Commit `4154b33a2` deleted both scripts and replaced them with
`scripts/check-numbered-sequences.sh`, driven by a list of sequences
(`apps/*/api/src/database/migrations` and `docs/adr`), so the next sequence is
one line, not a third script. Both standards now cite it. The `docs/adr` line
closed a collision that had no gate, recorded in
[`an-adr-number-goes-to-whoever-writes-it-first`](./an-adr-number-goes-to-whoever-writes-it-first.md).
The merged script still runs in `.husky/pre-commit` and `ci.yml` today
(measured, `grep -rln numbered-sequences .husky .github`).

## Eradication

**Type:** knowledge (level 5). The duplicate-gate class has no mechanism
today.

**Reference:** commit `4154b33a2` also shipped
`scripts/check-gate-names-are-distinct.sh`, which folded each gate name to
five-letter stems and refused two gates with the same stems. Commit
`c54e32da7` (PR #224, "cut the cost of a feature") deleted it, by operator
decision, among the gates "that guard gates". So this entry no longer has a
level-2 mechanism, and the merged sequence gate is the only part that holds.

**Proposed:** remove the subject instead of guarding it. ADRs already avoid
number collisions by naming files with a UTC minute. Migrations could take a
timestamp prefix too: drizzle-kit's `migrations.prefix` accepts `timestamp`
(measured in its type declarations). Two branches could then never take the
same id, and the migration line of `SEQUENCE_GLOBS` could go. Guess, not
checked: pragma has no drizzle `_journal.json`, so its migration runner may
order files by their numeric prefix and need a change too.

**Proof it can fail:** not applicable at level 5. When the stem check existed,
copying `check-numbered-sequences.sh` to `check-numbered-sequence.sh` made it
exit 1 naming both.

**Similar instances:** `ls scripts/check-*.sh scripts/hooks/checks/*.core.ts`
lists every gate for a reader to compare by name. The third collision of the
same shape, in `docs/adr`, is the entry linked above.
