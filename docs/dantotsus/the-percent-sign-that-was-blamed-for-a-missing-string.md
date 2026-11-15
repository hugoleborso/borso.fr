---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#327'
fix-pr: none (opened by the kaizen pull request for #327)
fix-commits: [self]
eradication-level: 1
eradication-paths: [infra/cdk/src/internal/agent-reader/read-only-query.utils.ts]
time-to-detect: days
tags: [dsql, cdk, tooling, agents, testing]
zone: infra/cdk/src/internal/agent-reader/read-only-query.utils.ts
recurs: none (the first defect in how the reader rebuilds the statement it accepted)
---

# The percent sign that was blamed for a missing string

## User impact

An agent on PR #327 could not read production rows by a text pattern. It
logged the cause as the `%` sign:

```text
[main] scripts/db-read.sh fails with a syntax error on any query containing a % (ILIKE '%x%'), so a LIKE pattern cannot be read.
```

| | Seen | Expected |
| --- | --- | --- |
| `SELECT name FROM song WHERE name ILIKE '%love%'` | a Postgres syntax error | the matching songs |
| `SELECT 1 AS "n"` | a syntax error | one row |
| `SELECT format('%s', 1)` | one row | one row |

The last row shows that `%` was never the cause. Any statement whose last token
was a string, a quoted name or a dollar body lost that token.

## Causal chain

- The reader Lambda answered with a syntax error.
  - It ran `SELECT * FROM (\nSELECT name FROM song WHERE name ILIKE\n) AS capped_result LIMIT 200`.
    - `decideReadOnlyQuery` returned `source.slice(0, code.trimEnd().length)`.
      - `code` is the source with every literal and comment blanked to spaces,
        so `trimEnd` removed the trailing `'%love%'` together with real blanks.

Measured at each layer this session. `aws lambda invoke --debug` against an
unreachable endpoint sent the body `{"query": "... ILIKE '%b%'"}` intact. The
utils returned `{"accepted":true,"statement":"SELECT name FROM song WHERE name ILIKE"}`.

## Root cause of occurrence

*Thought the masked code ends where the statement ends, actually masking turns a
trailing literal into the same spaces as a trailing comment.*

The trim was written to drop a trailing `-- comment`, which the old test
`acceptedStatement('SELECT 1 -- done')` pinned to `'SELECT 1'`. No test ended a
statement with a literal.

## Detection failure causes

- **Unit tests:** every accepted statement in the suite ended in a keyword, a
  number or a parenthesis.
- **Mutation:** 100%, because no mutant of that line changes an output the
  tests assert.
- **The agent:** the first query that failed held a `%`, so the symptom was
  named after the most visible character.

## Countermeasure

The statement keeps its full source extent up to the trailing terminator, and
only real whitespace is trimmed. A trailing comment now stays in the statement.
That is harmless because `buildReadOnlySessionCommands` already closes the
statement with a newline, and its test pins that with `'SELECT 1 -- x'`.

## Eradication

**Type:** structural impossibility (level 1). The trim no longer reads the
masked text, so no literal can be mistaken for blank.

**Reference:** this kaizen pull request · commit `self`

```diff
-  return { accepted: true, statement: source.slice(0, code.trimEnd().length) };
+  return { accepted: true, statement: source.slice(0, code.length).trimEnd() };
```

New tests: `keeps a string, a quoted name or a dollar body that ends the
statement` and `keeps a comment that closes the statement`. Coverage stays 100%
and `scripts/mutate-changed.sh origin/main infra/cdk/src/internal/agent-reader`
killed 152 of 152 mutants (12 timeouts, 0 survivors).

The old line put back on a scratch copy fails three tests:

```text
 FAIL  read-only-query.utils.test.ts > decideReadOnlyQuery > keeps a string, a quoted name or a dollar body that ends the statement
Expected: "SELECT name FROM song WHERE name ILIKE '%love%'"
Received: "SELECT name FROM song WHERE name ILIKE"
      Tests  3 failed | 68 passed (71)
```

The fix reaches production when the reader Lambda is next deployed, which a
merge to `main` does.

Related entries:

- [`the-blocklist-that-was-empty-because-nothing-was-deployed`](./the-blocklist-that-was-empty-because-nothing-was-deployed.md), the other reader defect.
