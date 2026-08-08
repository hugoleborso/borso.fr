# ADR-0008: Purity is enforced by file location, not by review

- **Status:** Accepted
- **Date:** 2026-08-08
- **Deciders:** Hugo Le Borso
- **Tags:** meta, standards, purity, testing, mutation-testing
- **First applied in:** PR #40 (`claude/complete-sites-refactoring-yr8pqd`)

## Context

The repo already had the shape: `*.utils.ts` for cross-cutting pure helpers,
`*.core.ts` for a bounded context's domain rules, both gated at 100% coverage by
the test runner. 74 such files existed.

What it did not have was any force pushing logic *into* them. Whether a
condition lived in a service or in a core file was a review question, and review
is not a gate. The brief for PR #40 asked for the strong form: every condition
in a pure function, every pure function in a `*.core.ts` file, every pure
function covered at 100% and mutation-tested with zero survivors.

The strong form has a failure mode, and this branch hit it. The first version of
`conditions-live-in-pure-functions` flagged every branch it could see. Over
`apps/**` that was 650 findings, and a sample of them looked like this:

```ts
if (raw === null) return [];
const chart = row.chart === null ? null : JSON.parse(row.chart);
if ('title' in updates && updates.title !== undefined) encoded.title = updates.title;
```

None of those is a decision. They are null handling and serialisation plumbing.
Extracting each into a named pure function would have produced a pile of
one-line functions and a matching pile of tests asserting the obvious, and the
100% coverage gate would then have forced someone to write them. A rule that
mostly fires on non-defects gets switched off, correctly, and takes the real
findings with it.

## Decision

**Enforce purity through three custom ESLint rules that key on file location,
and narrow "condition" to mean a decision rather than a branch.**

1. `conditions-live-in-pure-functions` — a decision may not sit in a file that is
   not `*.core.ts` or `*.utils.ts`. Six shapes are exempt because they are not
   decisions: shape tests (`=== null`, `=== undefined`, `!x`, `'k' in o`,
   `Array.isArray`, `typeof`, `instanceof`, and conjunctions of those), emptiness
   tests (`.length` or `.size` against `0`), guard clauses (a single `return` or
   `throw` with no `else`), an `if` with no `else`, a choice between two plain
   values, and a `switch` used as a lookup table.
2. `pure-functions-live-in-core-files` — a function with no impurity marker,
   declared outside a pure file, must move into one.
3. `no-date-now-in-core-files` — a pure file may not read the clock. `now` is a
   parameter, which makes `vi.setSystemTime()` the only place time is injected.

Each exemption in rule 1 carries a `RuleTester` case naming the shape, and each
still-invalid counterpart carries one too, so the boundary is executable rather
than described.

Coverage and mutation testing hang off the same file suffix: `vitest` asserts
100% statements, branches, functions and lines on `**/*.{core,utils}.ts`, and
Stryker runs with `break: 100` for any workspace whose pure files changed.

## Consequences

- `+` **The gate is the file name.** A reviewer does not have to judge whether a
  helper is pure enough to be tested; the linter decides where it lives and the
  coverage gate decides how well it is tested.
- `+` **Extraction is cheap when the rule is right.** The four application
  refactors moved about 90 functions into pure files, and the tests came with
  them because the gate would not let them land otherwise. `*.core.ts` and
  `*.utils.ts` files went from 74 to 142.
- `+` **`no-date-now-in-core-files` removed a whole class of flaky test.** Time
  is now an argument everywhere it matters.
- `−` **The narrowing is a judgement call and it will be wrong at the edges.**
  "A choice between two plain values decides nothing" is defensible but not
  obviously true; a `switch` used as a lookup table can grow into a decision one
  case at a time, and the rule will not notice. The exemption list is the thing
  most likely to need revisiting.
- `−` **Mutation testing at `break: 100` does not pass yet.** It is wired and it
  runs; the survivors are real gaps in the pure-file tests. Until they are
  closed, the gate is skipped via `SKIP_MUTATION_GATE=1`, which is an escape
  hatch that will be used out of habit if it stays available long.
- `−` **`pure-functions-live-in-core-files` has the defect this ADR just fixed in
  its sibling.** Its impurity detection misses module-level mutable state,
  `async` without `await`, and argument mutation, so it reports impure functions
  as pure. 73 suppressions, roughly one in three a false positive.
- `~` **The purity rules stop at `apps/**` and `infra/**`.** Repository tooling
  under `.claude/` and the root config files are exempt, because dragging a build
  script's branches into a `.core.ts` file would subject tooling to the coverage
  and mutation gates for no benefit.

## Alternatives considered

### Option A — Location-keyed rules with a narrowed definition of "condition" (chosen)

- **Summary:** three ESLint rules keyed on the `*.core.ts` / `*.utils.ts` suffix,
  with six named exemptions and a test per exemption.
- **Strengths:** enforceable; the exemption list is executable and reviewable;
  reuses the coverage and mutation gates that already key on the same suffix.
- **Costs:** the exemption list is a judgement call and will need revising; two
  of the three rules are known to be imprecise today.
- **Rationale:** the only option where the standard is checked rather than
  described.

### Option B — Flag every branch outside a pure file (rejected)

- **Summary:** the first implementation. No exemptions.
- **Strengths:** trivially simple to state and to implement; no judgement calls
  at the edges.
- **Costs:** 650 findings over `apps/**`, of which the sampled majority were null
  handling and serialisation. Complying would have produced hundreds of one-line
  functions and the tests to cover them.
- **Rejection rationale:** a rule that mostly fires on non-defects is a rule that
  gets disabled. Narrowing it took findings to 101 and suppressions from 950 to
  368, most of which was the rule being wrong rather than debt being paid.

### Option C — Review checklist, no rule (rejected)

- **Summary:** write the standard down, check it in `/technical-validation`.
- **Strengths:** zero false positives, because a human judges each case; no
  exemption list to maintain.
- **Costs:** not a gate. The repo already had the file convention and 74 pure
  files, and logic still accumulated in services, which is the evidence that
  review alone does not hold this line.
- **Rejection rationale:** the branch exists to convert preferences into checks.

### Option D — A `pure` marker in code (a decorator, a naming prefix, a JSDoc tag) (rejected)

- **Summary:** mark pure functions explicitly rather than inferring purity from
  where they live.
- **Strengths:** no false positives from imperfect impurity detection; a function
  can be pure without moving file.
- **Costs:** the marker is self-asserted, so nothing stops an impure function
  carrying it; the coverage and mutation gates key on file globs, so they would
  need a second mechanism to find marked functions; and it does not answer the
  brief's actual question, which is where the logic should live.
- **Rejection rationale:** trades a mechanical check for an honour system.

## How this is enforced

- `eslint.config.js` applies the three rules to `apps/**/*.{ts,tsx}` and
  `infra/**/*.ts`.
- The vitest config asserts 100% statement, branch, function and line coverage on
  `**/*.{core,utils}.ts` in every workspace.
- `.husky/pre-push` runs Stryker for any workspace whose `*.core.ts` or
  `*.utils.ts` files changed on the branch, at `break: 100`.
- `pnpm run test:eslint-rules` runs the `RuleTester` cases, including one per
  exemption shape.

## See also

- [`docs/standards/02-purity-and-core-files.md`](../standards/02-purity-and-core-files.md)
- [`docs/standards/10-testing.md`](../standards/10-testing.md)
- [ADR-0007](./0007-eslint-with-type-aware-rules-replaces-biome.md), which
  introduced the custom rule mechanism these three rules use.
