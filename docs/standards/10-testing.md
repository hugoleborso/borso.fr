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

`vitest run --coverage` fails when any file matching `**/*.core.ts` or
`**/*.utils.ts` falls below full statement, branch, function, and line
coverage.

Files that touch the DOM, the network, React state, or any other side effect
are out of scope for the gate, and they do not carry the suffix. A file that
mixes pure helpers with impure code gets split rather than exempted.

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
