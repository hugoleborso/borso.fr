---
date: 2026-10-02
introduced-at: self-validation
detected-at: review
severity: medium
related-pr: "#107"
fix-pr: "#119"
fix-commits: [aea99b0]
eradication-level: 4
time-to-detect: hours
tags: [agents, validation, testing, spec]
---

# The edge case two validators graded PASS

## Symptom

PR #107 took four technical validation passes. Three returned FAIL, each
on a row the one before had missed. The third found that one edge case,
*"the new password equals the old one: allowed, and the epoch still
moves"*, had no test at all. The first and second passes had both graded
it PASS, citing test lines that always sent a different password.

## Root-cause chain

1. **Why was an untested case graded PASS?** The validator cited tests
   that reached the recovery code and named nearby behaviour, without
   checking that they set up the case's condition.
2. **Why was that accepted?** The brief asked for a test's `describe`/`it`
   text and its file:line. A title and a location look like evidence and
   are not.
3. **Why was the case missing from the tests to begin with?** The spec's
   *Test strategy* listed the back-e2e cases to write and left this one
   out, though *Use cases / edge cases* stated it two paragraphs above.
4. **Why did that omission reach the validator?** The brief said to build
   the row list from *Use cases / edge cases*, but a validator reading a
   spec that enumerates its tests takes the enumeration as the list.

**Root cause:** thought a validator walking the spec's test plan checked
the spec, actually the test plan is the author's opinion of the spec and
inherits whatever the author forgot.

## Detection failure causes

- **CI:** no gate maps a spec's prose claims to tests; it cannot.
- **Code review:** the validator is the code review, and its brief let a
  citation stand in for a demonstration.
- **Mutation testing:** the gate mutates `*.core.ts` and `*.utils.ts`
  only, so a service-level test's power to fail is never measured.

## Countermeasure

- **Code:** PR #107 added the missing case (`3f473cd`), then the 503 and
  username-normalisation cases the fourth pass found asserted only
  indirectly (`73d85e7`).

## Eradication (mandatory — code-level)

**Type:** detection (level 4 — detection)

**Reference:** commit `aea99b0`

**The actual fix:** category D of `.claude/agents/technical-validator.md`
now requires walking *Use cases / edge cases* bullet by bullet, splitting
a bullet that makes two claims, and never substituting the *Test strategy*
list; each row quotes the assertion that would fail if the claim were
false, and a claim no test can assert is marked **structural** with the
line of code that guarantees it:

```diff
+   - A test that reaches the right function without setting up the row's condition does not cover it.
+   - A claim no test can assert … is a PASS row whose *Covering test* cell opens with **structural:**
```

The fourth pass of PR #107 was briefed this way by hand and returned no
failing row.

Higher levels were considered. A mechanical gate would need to map
English claims to test bodies, which no script in this repository can do
honestly; a mandatory "claim → test title" table in every spec, checked
for title existence, proves a test exists but not that it covers the
claim, which is precisely the failure here. The validator is the right
place, so the eradication sharpens it.

**Sibling defects swept:** `docs/features/pragma/password-recovery-with-the-band-password/`
— both remaining unasserted claims of that spec were pinned in `73d85e7`.

## See also

- [`driving-pragma-auth-from-a-validator.md`](../knowledge/driving-pragma-auth-from-a-validator.md)
