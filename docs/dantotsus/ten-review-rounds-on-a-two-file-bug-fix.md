---
date: 2026-08-21
introduced-at: conception
detected-at: review
severity: medium
related-pr: 84
fix-pr: 85
fix-commits: [7747353, 2672da6]
eradication-level: 2
time-to-detect: hours
tags: [standards, review, seals, meta]
---

# Ten review rounds on a two-file bug fix

## Symptom

A bug report — an instrument delete that did not look optimistic — became a
59-file pull request with 13 commits and ten rounds of standards review. Nine
of those rounds returned findings and every finding was real, but by round five
the subject had drifted: an edition delete that orphaned its roster, punch
writes with no transaction, a hand-written row type, an error class in the wrong
layer. None of it was about optimistic updates.

The operator asked, halfway through: *"Pourquoi c'est en draft ?"* The honest
answer was that the review had not stopped finding things and nobody could see
how deep it went.

## Root-cause chain

1. **Why did the review keep finding things?** Each round's fix touched files
   the previous rounds had not, and the seal gate reviews a file the first time
   anything pulls it into a diff.
2. **Why did fixing a front-end refetch touch back-end files?** Round four
   showed a projection was derivable from the list the mutation had just
   written, so the selection moved to a shared `domain/` folder. That put
   `edition.service.ts` in the diff, which put its cascade in front of a
   reviewer, whose fix put the punch and runner slices in the diff.
3. **Why did that compound instead of converging?** Every file carries its
   whole unreviewed history, not just its diff. A one-line delegation exposes
   every finding in a 200-line service.
4. **Why did the operator not stop it at round two?** Because nothing in the
   reports said which findings the branch had caused. Each report named a real
   defect and a real fix; none of them said *"the branch never touched these
   lines"* or *"this is four lines"* or *"this is a refactor across three
   files"*. Without that, every finding reads with the same urgency.
5. **Why did the reviewer not volunteer it?** Its contract did not ask for it.
   The report format specified path, bullet, quoted line and remedy — all about
   the finding, nothing about the finding's relationship to the change under
   review.

**Root cause:** *thought "a review that only reports real findings is a review
working correctly", actually "a real finding on code the branch never wrote is
a scope decision, and a report that does not mark it as one hands the operator
no way to make that decision except to keep going".*

## Detection failure causes

- **The gate:** working exactly as designed, and it earned its keep — two of
  the findings were data-integrity bugs a user would hit, including a deleted
  edition whose roster came back when its slug was reused. Nothing here argues
  for a weaker gate.
- **The reports:** each one correct in isolation. The missing information was
  never a fact about the code, so no amount of care per report would have
  produced it.
- **`seal.ts verify`:** printed its file list only on failure, so a reviewer
  had to fail the gate once to learn its own scope, and reported `unsealed` for
  both a first review and a re-review after an edit. Four of the ten rounds
  logged friction about this; the reviewer had to grep `seals.jsonl` by hand to
  tell the two apart.
- **The operator:** asked the right question at round four and got a
  round-by-round answer, because that was the only shape the information had.

## Countermeasure

Round nine's brief asked the reviewer, ad hoc, to say for each finding whether
the branch introduced it and how large the fix was. Its report did, and the
round-ten decision took seconds instead of an investigation. That worked, so
it stops being ad hoc.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2), in two parts.

**Reference:** [PR #85](https://github.com/hugoleborso/borso.fr/pull/85) · commits [`7747353`](https://github.com/hugoleborso/borso.fr/commit/7747353), [`2672da6`](https://github.com/hugoleborso/borso.fr/commit/2672da6)

**The actual fix — the report contract.** Every finding now carries two
required lines, in `.claude/agents/standards-reviewer.md`:

```diff
 <Why it fails the bullet, in one or two sentences. What would satisfy it.>
+
+Introduced: <by this branch | pre-existing, the branch's diff on this file is <what it touched>>
+Fix size: <one line | one file, no callers | N call sites across M files>
```

with a rule telling the reviewer why, and a section in the skill telling the
operator how to read the pair: a one-line fix on a pre-existing finding is
cheaper to ship than to schedule, a refactor is not, and the seal on the
untouched half stays valid either way because a seal is on content and not on
a path.

**The actual fix — the gate's own output.** `seal.ts verify` now prints the
reviewable set on success as well as on failure, so a reviewer learns its scope
without failing first, and `verifySeals` tells the two failures apart:

```diff
-export type SealFailureReason = 'unsealed' | 'sealed-against-an-older-ledger';
+export type SealFailureReason =
+  | 'never-reviewed'
+  | 'edited-since-it-was-reviewed'
+  | 'sealed-against-an-older-ledger';
```

`never-reviewed` is a file entering review for the first time — the case this
dantotsu is about, and the one where `Introduced` matters. `edited-since-it-was-reviewed`
is a re-review after a fix, where it does not.

**What this does not fix:** the compounding itself. A branch that touches a new
file will still surface that file's history, and it should — the two data bugs
were found that way. What changes is that the operator sees the shape of it on
round one.

## See also

- [`the-blueprint-that-mandated-the-refetch-that-undid-it.md`](./the-blueprint-that-mandated-the-refetch-that-undid-it.md)
  — the defect that started the branch.
- [`the-marker-that-moved-to-the-function-below-it.md`](./the-marker-that-moved-to-the-function-below-it.md)
  — one of the findings, and an example of the kind only a reader catches.
- [`docs/standards/README.md`](../standards/README.md) — why the seal is
  recorded rather than trusted.
