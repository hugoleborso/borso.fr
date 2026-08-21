---
date: 2026-08-20
introduced-at: eslint-rules/rule-tester.js
detected-at: first custom rule suite
severity: low
related-pr: https://github.com/hugoleborso/borso.fr/pull/76
fix-commit: n/a (the wiring in rule-tester.js is the fix)
time-to-detect: minutes
tags: [eslint, vitest, rule-tester, testing]
---

# ESLint's RuleTester needs Vitest's globals wired by hand

`RuleTester` registers its cases through whatever test globals it finds on the
runtime — `describe`, `it`, `it.only`, `afterAll`. **Vitest does not install
those globals unless `globals: true` is set**, so a suite that simply calls
`new RuleTester().run(...)` registers nothing and passes vacuously.

`eslint-rules/rule-tester.js` assigns them explicitly:

    RuleTester.describe = describe;
    RuleTester.it = it;
    RuleTester.itOnly = it.only;
    RuleTester.afterAll = afterAll;

This is deliberately done there rather than by turning `globals: true` on in
the Vitest config, so a setting that exists for exactly one folder does not
apply to every workspace.

## Why it matters

The failure is silent in the worst direction: a rule suite that registers no
cases reports success. Any new rule suite must go through
`createRuleTester()` from that module rather than constructing a `RuleTester`
directly.

## A related trap in the same harness

`RuleTester` also reports an **unused disable directive** as a failure. A
`valid` case written to prove a rule tolerates `// eslint-disable-next-line
some/other-rule` therefore fails, because that other rule is not enabled inside
the tester. Assert that case against the rule's exported predicate instead of
through `valid`.
