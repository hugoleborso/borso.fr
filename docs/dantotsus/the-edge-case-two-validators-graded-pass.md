---
date: 2026-10-02
introduced-at: self-validation
detected-at: review
severity: medium
related-pr: '#107'
fix-commits: [aea99b0cc8]
eradication-level: 5
eradication-paths: [.claude/agents/technical-validator.md, .claude/skills/specification/template.md]
time-to-detect: hours
tags: [agents, validation, testing, spec]
zone: .claude/agents/technical-validator.md
---

# The edge case two validators graded PASS

## User impact

The operator waited through four technical validation passes on PR #107.
Three returned FAIL, each on a row the one before had missed.

| | Seen | Expected |
| --- | --- | --- |
| Edge case *"the new password equals the old one: allowed, and the epoch still moves"*, passes 1 and 2 | PASS, citing test lines that always sent a different password | FAIL, no test sets up that case |
| Pass 3 | FAIL on that case | the same verdict on pass 1 |

No band member saw a wrong behaviour. The cost was the extra rounds.

## Causal chain

- Passes 1 and 2 graded an untested case PASS.
  - The validator cited tests that reached the recovery code and named nearby
    behaviour, without checking that they set up the case's condition.
    - The brief asked for a test's `describe`/`it` text and its `file:line`.
      A title and a location look like evidence and are not.
  - The case had no test.
    - The spec's *Test strategy* listed the back-e2e cases to write and left
      this one out, though *Use cases / edge cases* stated it two paragraphs
      above.
      - The validator built its rows from the *Test strategy* list. The brief
        said to use *Use cases / edge cases*, but a spec that enumerates its
        tests offers a ready list, and the process let two lists of the same
        cases exist (Method).

## Root cause of occurrence

*Thought a validator walking the spec's test plan checked the spec, actually
the test plan is the author's opinion of the spec and inherits whatever the
author forgot.* (Method)

The spec template asked authors to enumerate tests beside the use cases, so
every spec carried two sources for the same cases. The validator's process
named the right one and did not forbid the other.

## Detection failure causes

- **CI:** no gate maps a spec's prose claims to tests, and none can.
- **Code review:** the validator is the code review, and its brief let a
  citation stand in for a demonstration.
- **Mutation testing:** the gate mutates `*.core.ts` and `*.utils.ts` only, so
  a service-level test's power to fail is never measured.

## Countermeasure

PR #107 added the missing case (`3f473cd`), then the 503 and
username-normalisation cases the fourth pass found asserted only indirectly
(`73d85e7`).

## Eradication

**Type:** knowledge (level 5). The fix is an edit to an agent's instructions
and to the spec template.

**Reference:** commit `aea99b0`.

Category D of `.claude/agents/technical-validator.md` walks *Use cases / edge
cases* bullet by bullet, splits a bullet that makes two claims, and never takes
rows from *Test strategy*. Each row quotes the assertion that would fail if the
claim were false. A claim no test can assert is marked **structural** with the
line of code that guarantees it.

```diff
+   - A test that reaches the right function without setting up the row's condition does not cover it.
+   - A claim no test can assert … is a PASS row whose *Covering test* cell opens with **structural:**
```

The duplicate source is gone since. `.claude/skills/specification/template.md`'s
*Test strategy* no longer lists cases, and `technical-validator.md:106` says
"Never take the rows from *Test strategy*, which is the author's plan of tests
and can leave out a case."

**Proof it can fail:** the fourth pass of PR #107 was briefed this way by hand
and returned no failing row.

No higher level works here. A gate would need to map English claims to test
bodies, which no script in this repository can do honestly. A mandatory
"claim to test title" table, checked for title existence, proves a test exists
but not that it covers the claim, which is the failure here. Mutation testing
cannot see a missing test for code that has no branch.

**Similar instances:** in `docs/features/pragma/password-recovery-with-the-band-password/`,
both remaining unasserted claims were pinned in `73d85e7`.
