# 02. Purity and core files

## Rule

Every business decision in this codebase sits inside a pure function, and every
pure function sits in a file named `<something>.core.ts` or
`<something>.utils.ts`.

The two halves are one idea, which is that you decide in pure code and act in
impure code.

## Reason

A pure function has no setup cost, so you call it with values and assert on
values, without a mock, a fixture database, a fake timer, or a rendered
component. Exhaustive testing therefore becomes cheap, and cheap tests are the
tests people actually write.

The second effect is larger. When every decision has to move into a pure
function, the impure code left behind reads inputs, calls one decision
function, and applies the result, so a reviewer can check it by eye.

Mutation testing only produces a useful signal on pure code, because a
surviving mutant inside a function that talks to Postgres could survive for a
dozen unrelated reasons, whereas a surviving mutant inside
`projectRunnerStanding` names the branch that has no test.

## What counts as pure

A pure function returns the same output for the same input, forever. It reads
nothing outside its arguments, which rules out `Date.now()`, `Math.random()`,
`process.env`, module level mutable state, `window`, and `document`. It writes
nothing outside its return value, which rules out mutating an argument,
logging, and any input or output.

Time and randomness become arguments:

```ts
// Don't
export function isRaceOver(edition: Edition): boolean {
  return Date.now() > edition.endsAt.getTime();
}

// Do
export function isRaceOver(edition: Edition, now: Date): boolean {
  return now.getTime() > edition.endsAt.getTime();
}
```

Passing `now` explicitly removes the need for `vi.setSystemTime()`, and it
turns "what happens one millisecond before the cutoff" into a one line test.

## Every decision moves

People push back on the rule below more than any other, so here it is with real
code.

```tsx
// Don't, because the decision is buried in JSX
{
  runner.status === 'finished' && runner.lapCount >= edition.requiredLaps ? (
    <FinisherBadge />
  ) : runner.status === 'dnf' ? (
    <DidNotFinishBadge />
  ) : null;
}
```

```ts
// runner-badge.core.ts
export type RunnerBadgeKind = 'finisher' | 'did-not-finish' | 'none';

export function selectRunnerBadgeKind(runner: Runner, edition: Edition): RunnerBadgeKind {
  if (runner.status === 'finished' && runner.lapCount >= edition.requiredLaps) {
    return 'finisher';
  }
  if (runner.status === 'dnf') {
    return 'did-not-finish';
  }
  return 'none';
}
```

```tsx
// RunnerBadge.tsx, which now holds a lookup and no condition
const BADGE_BY_KIND = {
  finisher: FinisherBadge,
  'did-not-finish': DidNotFinishBadge,
  none: Fragment,
} as const;

const Badge = BADGE_BY_KIND[selectRunnerBadgeKind(runner, edition)];
return <Badge />;
```

The JSX now has no logic for a reviewer to check, and the logic now has a name,
a return type, and three tests.

### What the rule counts as a condition

The rule counts `if`, `else if`, the ternary operator, `switch`, and `&&` or
`||` when either one chooses between behaviours rather than combining values.

### What the rule exempts

A guard clause that only narrows a type or throws is exempt, e.g.,
`if (result === null) throw new NotFoundError()`. An early return in a
controller that maps an absent resource to a 404 is exempt. Any condition
inside a `.core.ts` or `.utils.ts` file is exempt, because a condition inside
one of those files is exactly where the rule wants it. React's own `Suspense`
and error boundary fallbacks are exempt.

The ESLint rule encodes the same list.

## Choosing between core and utils

Both suffixes carry the same purity requirement and the same coverage gate, and
they differ only in intent.

A `.core.ts` file holds the business rules of one bounded context, it lives
inside that context's folder, and its vocabulary is the vocabulary of the
domain.

```
api/src/ranking/ranking.core.ts
api/src/punch/punch.core.ts
site/src/routes/setlists/setlist-filter.core.ts
```

A `.utils.ts` file holds a cross-cutting helper with no domain meaning, e.g., a
formatter, a parser, a palette builder, or a URL composer.

```
site/src/lib/formatters.utils.ts
site/src/components/atoms/class-name.utils.ts
api/src/helpers/geo/haversine.utils.ts
```

When you cannot decide, ask whether a product manager would recognise the
function's name, and choose `.core.ts` when the answer is yes.

## A core file lives beside the code it serves

A `.core.ts` file sits next to the controller, service, and repository of its
slice, and it does not move into a horizontal folder inside `api/src/`.

```
# Do
api/src/songs/tonality.core.ts

# Don't
api/src/domain/tonality.core.ts
```

A horizontal folder forces you to open four directories to understand one
feature. Inside `api/src/`, `domain/`, `controllers/`, `services/`,
`repositories/` and `routes/` are all that shape, and all banned. Every rule
there has an owning bounded context, so the folder is the context's name. A
cross-cutting helper that belongs to no one context goes under
`api/src/helpers/<topic>/`. See
[04. Back end architecture](./04-backend-architecture.md).

There is one `domain/` folder that is not a horizontal folder, and the
difference is where it sits. `apps/<app>/domain/` lives beside `api/` and
`site/` rather than inside either, and holds only the rules **both sides read**,
reachable through `@domain/*`. It exists because a rule the song form and the
songs route both apply has no owning side, and duplicating it is how the two
copies drift.
[ADR-0010](../adr/0010-pragma-domain-folder-for-cross-boundary-rules.md) records
the decision and the conditions: a real caller on each side, or the rule belongs
to whichever side actually uses it.

```
# Do, when and only when both sides read it
apps/pragma/domain/tonality.core.ts

# Don't
apps/pragma/api/src/domain/tonality.core.ts
```

## Testing obligation

Every `.core.ts` and `.utils.ts` file ships with a sibling test file, and it
has to reach full statement, branch, function, and line coverage, with zero
surviving mutants under Stryker. Both checks run before a push. See
[10. Testing](./10-testing.md).

## Enforced by

- `eslint:borso/pure-functions-live-in-core-files` fails when a function with a
  branch and no impure call is declared outside a `.core.ts` or `.utils.ts`
  file.
- `eslint:borso/conditions-live-in-pure-functions` fails on a condition outside
  a `.core.ts` or `.utils.ts` file that does not match the exemption list above.
- `eslint:borso/no-impure-calls-in-core-files` rejects `Date.now`, a zero
  argument `new Date()`, `Math.random`, `fetch`, `process.env`, `localStorage`,
  and the console methods inside a `.core.ts` or `.utils.ts` file.
- `eslint:unicorn/consistent-function-scoping` moves a function that closes over
  nothing out to module scope.
- `gate:vitest-coverage` holds every pure file at full statement, branch,
  function and line coverage.
- `gate:stryker` fails when a mutant survives in a changed pure file.
- `script:scripts/check-pure-modules-have-callers.sh` fails a pure module whose
  only consumer is its own test, which otherwise scores full marks on both
  gates while running nowhere.
- `reviewer` checks the choice between `.core.ts` and `.utils.ts`, because the
  question is whether the name is one the band or the race would recognise, and
  no rule can ask that.
