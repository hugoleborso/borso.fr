# ADR-0013: `.schema.ts` carries the coverage gate

- **Status:** accepted
- **Date:** 2026-08-15
- **Deciders:** Hugo Borsoni (standing delegation: decide and record)
- **Tags:** meta, testing, backend

## Context

Widening the coverage gate to `.adapter.ts` needed a reason that was not "this
file felt important", so one was written down in
[10. Testing](../standards/10-testing.md):

> A suffix earns the coverage gate when its files hold behaviour that can be
> wrong without the type checker noticing, **and** that can be driven without a
> live dependency.

Auditing all twenty-one suffixes against it produced one uncomfortable result.
`.schema.ts` passes both halves and was not gated. Its Zod validators are
behaviour — a missing `.min(1)` accepts an empty title, a wrong `.max()` accepts
a 200-year duration, and the type checker sees neither — and they parse in
process with nothing to stand up.

The measurement at the time: adding `api/src/**/*.schema.ts` to pragma's
coverage include reported every one of its ten schema files at 0% statements,
because the fast suite never imported them. They were exercised end to end only,
where a route test happens to send a valid body and one or two invalid ones.

That left a rule that named its own exception, which is the shape this
repository keeps finding at the bottom of a defect.

## Decision

Gate `.schema.ts` the same way as `.core.ts`, `.utils.ts` and `.adapter.ts`:
full statement, branch, function and line coverage, per file, in the fast suite.

Sixteen sibling test files were written to meet it — ten in `pragma`, six in
`last-loop-lepin`.

## Alternatives considered

**Leave it ungated and say so.** Cheapest, and it was the state this branch
shipped for a day. Rejected because a criterion that excludes a qualifying case
for reasons of effort stops being a criterion, and the next person to ask "does
my suffix need a test?" gets an answer that depends on who is asking.

**Collect coverage in the back-e2e project instead.** The route tests already
touch these files, so the numbers would arrive with no new tests. Rejected: it
would report a schema as covered because one valid body went through it, which
is the opposite of what the gate is for, and it would put a Postgres between an
engineer and a red bar.

**Gate only the input schemas, not the table definitions.** Cleaner in theory,
since a Drizzle table is declarative. Rejected as unimplementable without a
second suffix — and the table halves turned out to be worth testing anyway, see
below.

## Consequences

**What it cost.** Less than expected. A Zod schema executes at import, so
statements and lines reach 100% as soon as any test imports the module; the work
is writing assertions that name a rule rather than restate the shape. Both
applications now report 100% on every metric: pragma 976 tests, last-loop-lepin
785.

**It found things.** The composite primary keys and the ordered-pair unique
index are declared in Drizzle callbacks that no import evaluates, so they showed
as uncovered functions. Reaching them needs `getTableConfig`, and the assertions
that resulted — `mastery_default` is keyed by `(member_id, instrument_id)`, a
transition comment is unique on `(song_a_id, song_b_id)` in that order — pin
exactly what a careless migration would break silently.

**Two negative consequences, stated plainly.**

1. **A new slice now costs a schema test before it can be pushed.** That is one
   more file between an idea and a green gate, and for a slice whose schema is
   three uuids it will feel like ceremony. The gate cannot tell a three-uuid
   schema from a thirty-rule one.
2. **A test that asserts a constraint restates that constraint.** Change the
   ceiling and two files change together, which is duplication that a reviewer
   has to read as intentional. The mitigation is in how the tests are written —
   each one names the rule in its title, so the pair reads as a specification
   and its implementation rather than as the same line twice — but the coupling
   is real and no convention removes it.

**Not adopted for the front end.** `site/**/*.schema.ts` does not exist today;
if it appears, this ADR applies to it by the same criterion rather than by a new
decision.
