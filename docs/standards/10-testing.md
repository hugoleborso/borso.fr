# 10. Testing

## Rule

Vitest runs every test in this repository. Every `.core.ts` and `.utils.ts`
file reaches full coverage and survives mutation testing with no surviving
mutants, and both checks run before a push.

## Reason

Coverage tells you a line ran, and it does not tell you an assertion would have
caught a change to that line. A test that calls a function and asserts nothing
reaches full coverage, so full coverage alone is not a quality signal.

Mutation testing supplies the missing signal. Stryker changes the code, e.g.,
it turns `>` into `>=` or removes a branch, and then it runs the tests. A
mutant that survives is a change to your code that no test noticed, which names
a specific missing assertion rather than a general worry.

Requiring the two checks only on pure files keeps the cost bounded, because
pure files run in milliseconds with no database and no browser.

## The three test projects

Each application defines its Vitest projects in `vitest.workspace.ts`.

The `core` project runs the pure tests plus the CDK snapshot tests, it needs no
services, and it runs on every commit.

The `back-e2e` project runs the API against a real Postgres started by
[`scripts/local-postgres.sh`](../../scripts/local-postgres.sh), which needs no
Docker, so the gate runs anywhere.

The `site` project runs component tests in jsdom with Testing Library.

## What to test at each level

Test a `.core.ts` or `.utils.ts` file directly and exhaustively, with one test
per branch and one per boundary value. Pass `now` explicitly rather than
setting the system time.

Test a service through its public method, with a real repository against the
test database, and assert on what the database holds afterwards.

Test a controller through the Hono application with `app.request()`, and assert
on the status code and the response body, and not on internal calls.

Test a component through what a user sees, using Testing Library queries by
role and by label, and never by class name or test identifier when a role
exists.

## Test naming

A test name states the behaviour and the condition, as a sentence someone could
read in a failure report.

```ts
// Don't
it('works', …);
it('test punch', …);

// Do
it('rejects a punch recorded before the minimum lap duration has elapsed', …);
it('returns an empty ranking when the edition has no punches', …);
```

A `describe` block names the unit under test, and the `it` names complete the
sentence.

## No mocks for pure code, and few mocks anywhere

A pure function needs no mock by definition, and needing one means the function
is not pure.

For impure code, prefer a real dependency, e.g., the test Postgres, over a
mock, because a mock asserts that you called something and not that the
something worked. Mock only what you cannot run, which in practice is the AWS
SDK clients and the network calls to third-party services.

## Coverage gate

`vitest run --coverage` fails when any file matching `**/*.core.ts`,
`**/*.utils.ts`, `**/*.adapter.ts` or `**/*.schema.ts` falls below full
statement, branch, function, and line coverage.

The first two are pure. The third is not, and it is on the list anyway: an
adapter is the one file in a bounded context that leaves the process
([ADR-0012](../adr/0012-outbound-calls-live-in-adapter-files.md)), which makes
it both the highest-risk file in the slice and, by its own blueprint, the
easiest impure file to drive — the fetcher, the clock and the cache are
arguments. An adapter that cannot be covered without a mock of its own vendor
is an adapter missing a seam.

Two branches hide there by construction and are worth naming, because both were
uncovered on every adapter in this repository until the gate was widened. A
module-level client cache means the region is read exactly once, so its default
is unreachable from a module that has already signed something; reach it with
`vi.resetModules()` and a dynamic import. A rate-limit wait needs
`vi.useFakeTimers()` and `advanceTimersByTimeAsync`, since the floor is real
time.

Everything else that touches the DOM, the network, React state, or any other
side effect is out of scope for the gate, and it does not carry any of the
three suffixes. A file that mixes pure helpers with impure code gets split
rather than exempted.

### Which suffix earns a gate

A suffix joins the list when its files hold behaviour that can be wrong without
the type checker noticing, **and** that can be driven without a live
dependency. Both halves matter: the first is why the test is worth writing, the
second is why it can be written at all.

| suffix          | behaviour that can be wrong | drivable without a dependency | gated |
| --------------- | --------------------------- | ----------------------------- | ----- |
| `.core.ts`      | yes, it is the rules        | yes, by construction          | yes   |
| `.utils.ts`     | yes                         | yes, by construction          | yes   |
| `.adapter.ts`   | yes: cache, rate floor, URL shape, error mapping | yes, the fetcher and clock are arguments | yes |
| `.controller.ts`| thin by rule, and every one already has a sibling test | no, it is an HTTP surface | no, covered end to end |
| `.service.ts`   | yes, orchestration          | no, it needs the database     | no, covered end to end |
| `.repository.ts`| yes, queries                | no, and a mocked query proves nothing | no, covered end to end |
| `.schema.ts`    | yes, a missing constraint is behaviour | yes, zod parses in process | yes |
| `.queries.ts`   | yes, optimistic updates     | its pure half already moves to `.core.ts` / `.utils.ts` | no |
| `.variants.ts`, `.types.ts`, `.d.ts`, `.config.ts` | declarative, the type checker is the test | n/a | no |

`.schema.ts` was the case that tested the criterion: it qualifies, and it was
not gated, which made the rule name its own exception. It is gated now — see
[ADR-0013](../adr/0013-input-schemas-carry-the-coverage-gate.md) — and the
sixteen sibling tests that closed it cost less than feared, because a Zod schema
executes at import and reaches full statement coverage as soon as a test imports
it. The work is writing assertions that name a rule rather than restate a shape.

Two things a schema test has to reach on purpose:

- **A refinement can be shadowed by an earlier one.** An array that breaks two
  rules reports only the first, so the case for the second rule has to satisfy
  every rule before it.
- **A composite key or a unique index lives in a Drizzle callback that no import
  evaluates**, so it reports as an uncovered function. `getTableConfig(table)`
  reaches it, and the assertion is worth having: it pins the column order a
  careless migration would change silently.

### An adapter's own obligation

Every `.adapter.ts` ships a sibling `*.adapter.test.ts` that runs under vitest
in the fast suite, reaches full coverage, and survives Stryker with no
surviving mutant — the same bar as a pure file, for the file that is least pure.

It is reachable because the blueprint makes it so: the fetcher, the clock and
the cache are options, so the test drives them with a stub and a fake timer
rather than a socket. An adapter that cannot be tested this way is missing a
seam, and adding the seam is the fix.

Two rules follow from having done it:

- **Do not assert through the vendor's own default.** A presigner whose default
  lifetime is 900 seconds cannot tell a lifetime that was passed from one that
  was never passed, so the test picks a value the vendor would not choose.
- **A value computed at module load is only observable in a test that
  re-imports the module.** Stryker calls these static mutants; a cached client's
  region default and a module-level constant both live there, and
  `vi.resetModules()` with a dynamic import is what reaches them.

There is no exemption for a small application, because a small pure function is
exactly the kind that is cheap to cover.

## Mutation gate

`pnpm run test:mutation` runs Stryker over the same file set, and it fails when
any mutant survives. The pre-push hook runs it, and CI runs it again on the
changed workspaces.

When a mutant survives, the fix is a new assertion, and it is not an exclusion.
Add a Stryker disable comment only for a mutant that is genuinely equivalent,
e.g., a change that cannot alter behaviour, and say why on the line.

## Enforced by

- `vitest run --coverage`, with per-file thresholds in each `vitest.config.ts`.
- `stryker run`, in the pre-push hook and in CI.
- `borso/test-file-has-sibling-source`, a custom ESLint rule, which fails when
  a `.core.ts` or `.utils.ts` file has no sibling test file.
