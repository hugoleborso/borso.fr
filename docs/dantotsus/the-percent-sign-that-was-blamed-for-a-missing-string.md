---
date: 2026-11-14
introduced-at: implementation
detected-at: local
severity: medium
related-pr: '#327'
fix-commits: [self]
eradication-level: 4
eradication-paths: [infra/cdk/src/internal/agent-reader/read-only-query.utils.ts, infra/cdk/src/internal/agent-reader/read-only-query.utils.test.ts]
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

- The reader Lambda answered with a syntax error
  - It ran `SELECT * FROM (\nSELECT name FROM song WHERE name ILIKE\n) AS capped_result LIMIT 200`
    - `decideReadOnlyQuery` returned the statement cut at the end of the
      masked code ← the faulty line

      ```ts
      return { accepted: true, statement: source.slice(0, code.trimEnd().length) };
      ```

      - `code` is the source with every literal and comment blanked to
        spaces (`const BLANK = ' '`), so `trimEnd` removed the trailing
        `'%love%'` together with real blanks
        - Commit `3bd18b51f` (PR #199, 2026-10-27) wrote the masking and the
          trim together, in `scripts/database/read-only-query.utils.ts:225`.
          The trim was meant to drop a trailing comment, and its test pinned
          only that: `acceptedStatement('SELECT 1 -- done')` is `'SELECT 1'`
          - The mask writes a literal with the same character as whitespace,
            so any whitespace operation on the masked text treats a literal
            as blank. Machine

Measured at each layer this session. `aws lambda invoke --debug` against an
unreachable endpoint sent the body `{"query": "... ILIKE '%b%'"}` intact. The
utils returned `{"accepted":true,"statement":"SELECT name FROM song WHERE name ILIKE"}`.

## Root cause of occurrence

*Thought the masked code ends where the statement ends, actually masking
turns a trailing literal into the same spaces as a trailing comment.*
**Machine.**

The writer built both halves in `3bd18b51f`: the mask that replaces every
literal and comment with spaces, and the trim that runs on the masked text.
With a space as the mask, a literal and real whitespace are the same
character, so the trim cannot tell them apart. The representation made the
mistake easy, and the one test of the trim ended in a comment, where the
two cases agree.

## Detection failure causes

- **Unit tests:** every accepted statement in the suite ended in a keyword, a
  number, a parenthesis or a comment.
- **Mutation:** 100%, because no mutant of that line changes an output the
  tests assert.
- **The agent that hit it:** the first query that failed held a `%`, so the
  symptom was named after the most visible character.

## Countermeasure

The statement keeps its full source extent up to the trailing terminator, and
only real whitespace is trimmed. A trailing comment now stays in the statement.
That is harmless because `buildReadOnlySessionCommands` already closes the
statement with a newline, and its test pins that with `'SELECT 1 -- x'`.

## Eradication

**Type:** detection (level 4). Unit tests pin the moved trim. The mask that
made the mistake easy is unchanged.

**Reference:** this kaizen pull request, commit `self`

```diff
-  return { accepted: true, statement: source.slice(0, code.trimEnd().length) };
+  return { accepted: true, statement: source.slice(0, code.length).trimEnd() };
```

New tests: `keeps a string, a quoted name or a dollar body that ends the
statement` and `keeps a comment that closes the statement`. Coverage stays 100%
and `scripts/mutate-changed.sh origin/main infra/cdk/src/internal/agent-reader`
killed 152 of 152 mutants (12 timeouts, 0 survivors).

**Proof it can fail:** the old line put back on a scratch copy fails three
tests:

```text
 FAIL  read-only-query.utils.test.ts > decideReadOnlyQuery > keeps a string, a quoted name or a dollar body that ends the statement
Expected: "SELECT name FROM song WHERE name ILIKE '%love%'"
Received: "SELECT name FROM song WHERE name ILIKE"
      Tests  3 failed | 68 passed (71)
```

**Gap in what holds:** another whitespace operation still reads the masked
text. `decideReadOnlyQuery` strips the terminator with
`TRAILING_TERMINATOR_PATTERN = /;\s*$/` on `masked.code`
(`read-only-query.utils.ts:43` and `:181`). A literal after the `;` is blank
there, so it is dropped instead of refused as a second statement. Measured
on today's file with Node: `decideReadOnlyQuery("SELECT 1; 'x'")` returns
`{"accepted":true,"statement":"SELECT 1"}`.

**Proposed:** mask with a character that is not whitespace, is not `;` and
cannot start a word, in `blankOut` and `maskSpan`. No `\s`, `trim` or
`trimEnd` on the masked text could then eat a literal, and `SELECT 1; 'x'`
would reach the separator check and be refused. `firstKeyword`'s
leading-parentheses handling and `WORD_PATTERN` need checking against the
new character. That would make the class impossible, not just this line.

**Similar instances:** `grep -n -e trim -e '\\s' infra/cdk/src/internal/agent-reader/read-only-query.utils.ts`
lists every whitespace operation. Three still read masked text, measured with
Node on today's file. The terminator pattern drops `'x'` after a `;`.
`LEADING_PARENTHESES_PATTERN` (`:42`) skips a leading literal as blank, so
`'x' SELECT 1` is accepted as a `SELECT`, and Postgres refuses it later.
`code.trim()` (`:182`) refuses `'x'` alone as "the query is empty". None of
them lets a write through, and each would read correctly under the proposed
mask.

The fix reaches production when the reader Lambda is next deployed, which a
merge to `main` does.

Related entries:

- [`the-blocklist-that-was-empty-because-nothing-was-deployed`](./the-blocklist-that-was-empty-because-nothing-was-deployed.md), the other reader defect.
