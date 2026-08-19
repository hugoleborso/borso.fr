# 10. Testing

## Rule

Vitest runs every test in this repository. Every `.core.ts` and `.utils.ts`
file reaches full coverage and survives mutation testing with no surviving
mutants. Mutation runs before a push, scoped to what the push changed;
coverage runs in CI, because a per-file threshold cannot be read off a
changed-only selection.

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

## The test projects

A full-stack application defines its Vitest projects in its own
`vitest.config.ts`. There is no `vitest.workspace.ts` anywhere in the
repository, and the absence is load-bearing: Vitest 3 scanned a config's own
directory for one and let it override the `include` written in the config,
which is how a mutation gate once ran over zero mutants. See
[the dantotsu](../dantotsus/a-mutation-config-a-workspace-file-overruled.md).

The `core` project runs the pure tests plus the CDK snapshot tests, it needs no
services, and it runs on every commit.

The `back-e2e` project runs the API against a real Postgres started by
[`scripts/local-postgres.sh`](../../scripts/local-postgres.sh), which needs no
Docker, so the gate runs anywhere.

The `site` project runs component tests in jsdom with Testing Library.

A front-end-only application (`borsouvertures`, `borso-fr`) defines no projects
at all — one `include` covers its whole suite, because it has no service to
start and no second environment to separate.

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
four suffixes. A file that mixes pure helpers with impure code gets split
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
| `.schema.ts`    | yes, a missing constraint is behaviour | yes, zod parses in process | coverage only, `api/src` |
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
any mutant survives.

Two places run it, and `ci.yml` is not one of them. The pre-push hook runs it
on every push, scoped with `--mutate` to the pure files that push changed,
which is seconds rather than the fifteen to twenty-five minutes an unscoped run
over one application costs. [`full-suite.yml`](../../.github/workflows/full-suite.yml)
then runs it unscoped on `main`, one job per application, with Stryker's
`--incremental` file restored from the Actions cache.

Scoping the push gate is only honest because the unscoped run exists somewhere,
and `main` is where it exists.

When a mutant survives, the fix is a new assertion, and it is not an exclusion.
Add a Stryker disable comment only for a mutant that is genuinely equivalent,
e.g., a change that cannot alter behaviour, and say why on the line.

## Enforced by

- `gate:vitest-coverage` fails when a file matching `**/*.core.ts` or
  `**/*.utils.ts` falls below the per-file thresholds each `vitest.config.ts`
  declares.
- `gate:stryker` fails when a mutant survives. It is scoped with `--mutate` to
  the changed pure files in the pre-push hook, and unscoped in `full-suite.yml`
  on `main`. Both cover every workspace that has pure modules, which since
  2026-08-15 means the four applications, the repository's own `scripts/`, and
  `infra/cdk`. The last two carried the coverage gate and no mutation
  configuration at all, and scored 77.40 and 80.84 the first time one was
  pointed at them.
- `script:scripts/check-mutation-covers-gated-files.sh` fails a workspace that
  holds gated files and ships no mutation configuration. A missing gate produces
  no output to be wrong, so the absence itself is what fails here — `infra/cdk`
  read as 100% covered for as long as nothing pointed Stryker at it, and the
  first run reported 90 survivors.
- `eslint:borso/test-file-has-sibling-source` fails when a `.core.ts` or
  `.utils.ts` file has no sibling test file.
- `reviewer` checks that a test name states the behaviour and the condition,
  and that a service test asserts on what the database holds rather than on
  which method was called.
