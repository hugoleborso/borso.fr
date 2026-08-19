---
date: 2026-08-08
introduced-at: conception
detected-at: review
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-commits: []
eradication-level: 2
time-to-detect: days
tags: [eslint, custom-rules, purity, standards, false-positives]
blueprints: [test-lint-rule]
---

# A rule written before its subject was understood, four times

## Symptom

`borso/conditions-live-in-pure-functions` says a decision may not sit outside a
`*.core.ts` or `*.utils.ts` file. It was rewritten three times, and its sibling
`pure-functions-live-in-core-files` twice, because each version flagged code
that was not a defect.

The counts, in order:

| Version | Findings over `apps/**` |
|---------|------------------------:|
| Flag every branch | 650 |
| Exempt shape tests, guards, lookup tables | 101 |
| Exempt already-named results | 0 |

Each narrowing was called the fix. The first two were wrong in ways the third
made obvious.

## Root-cause chain

The rule was written from the standard's sentence rather than from the code it
would run on. "A condition is a decision, and decisions belong in pure
functions" is true as prose and underspecified as a predicate, so the first
implementation used the only definition available to a parser: a branch node.

What the four defects actually were:

1. **A branch is not a decision.** `if (raw === null) return []` and
   `row.chart === null ? null : JSON.parse(row.chart)` are null handling.
   Extracting them buys one-line functions and tests asserting the obvious.
2. **A presence test is a presence test in both polarities.** The rule exempted
   `!x` and `x === null` but not `x ?`, so `...(props.dsqlSchema ? {…} : {})`
   failed while its own negation passed.
3. **A test that reads an already-named result is not deciding anything.**
   `isConcert ? … : …`, `props.hasOverride ? … : …`, `moreOpen ? … : …` — the
   deciding happened where the name was given. Re-extracting it produces a
   function that returns its own argument.
4. **`isTestFile` where `isTestPath` was meant.** The narrow helper matches a
   filename pattern; the wide one asks whether the file is under a test
   directory. Every sibling architecture rule used the wide one, and its own
   doc comment says why. This rule used the narrow one, twice — in
   `conditions-live-in-pure-functions` and in
   `pure-functions-live-in-core-files`.

Defect 4 is the interesting one, because the fix already existed in the same
folder with a comment explaining itself. It was not a hard problem; it was a
rule written without reading its siblings.

## Detection failure causes

- **A suppressions file made a wrong rule survivable.** 1,631 violations went
  into `eslint-suppressions.json` on day one so the rules could ship at `error`
  immediately. That was the right call for real debt and the wrong container for
  a false positive: an entry carries no reason, so "this rule is wrong" and
  "this code is wrong" look identical, and the pile was too large to sample.
  The operator's instinct — *"I think those eslint suppressions are coming from
  a wrong rule"* — was the first time anyone asked.
- **A high finding count read as a productive rule.** 650 findings looks like a
  rule doing work. It is equally the signature of a rule that has not been
  narrowed. Nothing in the process asked which.
- **The rule's own tests agreed with it.** Each version had a passing
  `RuleTester` suite, because the cases were written from the same
  misunderstanding as the implementation. The third narrowing had to move six
  existing invalid cases to valid, since they were bare-flag tests — the shape
  now exempt. A suite written alongside a rule cannot falsify it.

## Countermeasure

The shared predicates live in `eslint-rules/decisions.js` and both rules import
them, so a future correction lands in one place and cannot drift between the
two. Every exemption carries a `RuleTester` case naming the shape it covers,
and every still-invalid counterpart carries one too, so the boundary is
executable rather than described.

`eslint-suppressions.json` is deleted. An exception is now an inline
`eslint-disable-next-line <rule> -- <reason>` where the reason is a claim a
reviewer can check, backed by `reportUnusedDisableDirectives` so it cannot
outlive its problem. That removes the container a wrong rule could hide in: a
rule that misfires now produces visible comments repeating the same excuse,
which is a smell the standard names.

## Eradication

**Level 2 — a check that catches the misconception.** The shared predicate
module plus the per-shape test cases mean the next narrowing cannot silently
disagree with the sibling rule, and cannot pass a suite that was written to
match it.

Level 1 was not reachable here. There is no structural way to make "this
predicate matches the intent of a sentence in a standard" impossible to get
wrong, because the gap is between prose and a parser and something has to
bridge it by judgement.

## What to check next time

**Before writing a custom rule, run its predicate over the repository and read
a sample of what it catches.** Not the count — the code. Twenty findings read
in full would have caught defect 1 in an hour. 650 findings counted and
suppressed took three rewrites and an operator's suspicion.

**Write the exemption cases before the implementation.** The suite that ships
with a rule is written from the same understanding as the rule and cannot
falsify it. Cases drawn from real code in the repository can.

**Read the sibling rules first.** Defect 4 was a helper with a doc comment
explaining exactly which of two questions to ask, in a file the new rule
already imported.

A rule with hundreds of findings is not obviously working. Ask what fraction
you have actually read.
