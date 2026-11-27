---
date: 2026-08-08
introduced-at: conception
detected-at: review
severity: medium
related-pr: '#40'
fix-commits: [39c7588cd2, 8c28403de]
eradication-level: 4
eradication-paths: [eslint-rules/decisions.js, .oxlintrc.json]
time-to-detect: days
tags: [eslint, custom-rules, purity, standards, false-positives]
zone: eslint-rules/impurity.js
blueprints: [test-lint-rule]
---

# A rule written before its subject was understood, four times

## User impact

The developers of every app were told to move code that was not a defect.
`borso/conditions-live-in-pure-functions` says a decision may not sit outside a
`*.core.ts` or `*.utils.ts` file. It was rewritten three times, and its sibling
`pure-functions-live-in-core-files` twice, because each version flagged correct
code.

| Version | Findings over `apps/**` (measured by each commit) | Expected |
| --- | ---: | ---: |
| Flag every branch | 650 | only unnamed decisions |
| Exempt shape tests, guards, lookup tables | 101 | same |
| Exempt already-named results | 0 | same |

## Causal chain

- 650 findings over `apps/**`, then 1,631 entries in `eslint-suppressions.json`.
  - The rule reported null handling, presence tests and reads of a named flag.
    - Branch 1. It reported every branch node. `if (raw === null) return []`
      and `isConcert ? … : …` were reported like a business decision.
      - The predicate in de888f87b reports `if`, the ternary, `switch` and a
        JSX logical expression, with only throw guards and controller 404
        guards exempt.
        - The rule was built from `docs/standards/02-purity-and-core-files.md`,
          *Every condition moves*, whose only example is a compound business
          decision on a runner's status and laps.
    - Branch 2. It reported `x ?` while it exempted `!x` and `x === null`, so
      `...(props.dsqlSchema ? {…} : {})` failed while its negation passed.
      - The first narrowing listed the negative presence shapes and not the
        positive one.
    - Branch 3. Seven findings under `test/unit/helpers/` were never exempt.
      - Both purity rules call the narrow predicate.

        ```js
        if (isPureFile(filename) || isTestFile(filename)) { // ← ❌ test harness folders are not exempt
        ```

        - de888f87b (10:56 UTC) wrote this line when `isTestFile` was the only
          test predicate in `eslint-rules/impurity.js`.
          - ff6446f6a (13:01 UTC) added `isTestPath` beside it, with a doc
            comment saying harness folders count as tests, and moved only the
            rules it wrote. The two purity rules kept `isTestFile`.

## Root cause of occurrence

*Thought a "condition" in the standard's sense is any branch node, actually it
is a decision nobody has named yet. Null handling, a presence test and a read of
a named flag decide nothing.* (Material)

The writer was an agent. The definition it needed existed in no document at that
moment. The standard's sentence was "every condition lives in a pure function",
and its one example, at de888f87b's parent, is
`runner.status === 'finished' && runner.lapCount >= edition.requiredLaps`. The
definition of a decision was written later, by 8c28403de: "The deciding happened
where the name was given."

Branch 3 has its own cause. *Thought each rule picks the test predicate it needs,
actually the module exports two near-identical names, and a rule written before
the wide one existed keeps the narrow one.* (Machine) `eslint-rules/impurity.js`
still exports both `isTestFile` and `isTestPath` today.

## Detection failure causes

- **Rule tests:** each version had a passing `RuleTester` suite, written from
  the same understanding as the rule. The third narrowing moved six invalid
  cases to valid. A suite written alongside a rule cannot falsify it.
- **Local validation:** de888f87b counted its hits ("The rules found 1443
  places") and did not read a sample. Two hours later, ff6446f6a read the hits
  of its sixteen rules and found three false-positive classes. The purity rules
  were not run through that pass.
- **Suppressions file:** 1,631 violations went into `eslint-suppressions.json`
  so the rules could ship at `error`. An entry carries no reason, so "this rule
  is wrong" and "this code is wrong" looked identical. The operator's remark,
  *"I think those eslint suppressions are coming from a wrong rule"*, was the
  first time anyone asked.
- **Review:** a high finding count read as a productive rule. It is equally the
  signature of a rule that has not been narrowed.

## Countermeasure

39c7588cd moved both rules to `isTestPath` and moved the shared predicates to
`eslint-rules/decisions.js`. 8c28403de narrowed the rule to a decision nobody
has named (`isNamedResultTest`, `isNamedResultOrPresenceTest`). Findings went
from 107 to 0, nothing suppressed. Every exemption carries a `RuleTester` case
naming its shape, and every still-invalid counterpart carries one too.

## Eradication

**Type:** detection (level 4)

**Reference:** commits 39c7588cd and 8c28403de.

What holds today:

- Both purity rules import their predicates from `eslint-rules/decisions.js`,
  so a correction lands in one place and the two rules cannot disagree.
- `eslint-suppressions.json` is deleted. An exception is an inline
  `eslint-disable-next-line <rule> -- <reason>`, and `.oxlintrc.json` sets
  `"reportUnusedDisableDirectives": "error"`. A rule that misfires now shows as
  inline comments repeating one excuse, which a reviewer sees in the diff.

This detects a wrong rule in review. It does not stop one from being written.

**Proposed:** subtract the choice of test predicate. Rename `isTestFile` to a
name that says it matches a file name only, such as `hasTestFileName`, or replace
it with `isTestPath` where that fits. Then a new rule cannot pick the narrow one
because its name reads like the general question. Then have the rule-suite
harness lint a sample of real `apps/**` files as valid cases for each
architecture rule, so a predicate that flags correct code fails its own suite
before it ships. Neither exists yet.

**Proof it can fail:** not run for this entry.

**Similar instances:** `grep -ln "isTestFile\b" eslint-rules/*.js` lists six
rules that still call the narrow predicate: `no-adapter-import-in-pure-module`,
`no-dynamic-translation-keys`, `no-flat-components-folder`,
`no-impure-calls-in-core-files`, `no-literal-jsx-text` and
`test-file-has-sibling-source`. Whether each one means the narrow question is
unverified.
