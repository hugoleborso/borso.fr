# Writing a small function the 100% gates accept

Two gates run on every `*.core.ts`, `*.utils.ts` and `*.adapter.ts`: 100% on
all four coverage axes, and a mutation run that fails on a single survivor.
Both are worth having. Both also reject shapes that are perfectly reasonable
in isolation, and knowing which shapes ahead of time saves a cycle each time.

## A guard that satisfies `noUncheckedIndexedAccess` is a branch nothing covers

`tsconfig.json` sets `noUncheckedIndexedAccess`, so indexing an array yields
`T | undefined`. The obvious response is a guard:

```ts
const [mediaType] = contentType.split(';');
if (mediaType === undefined) return false;
```

`String.prototype.split` never returns an empty array, so that branch cannot
be taken, and the branch coverage gate reports the file at 95.83% with no test
able to fix it. The type checker demands the guard and the coverage gate
refuses it.

Reach for an accessor that returns a defined value instead of one that returns
`T | undefined`:

```ts
const separatorIndex = contentType.indexOf(';');
const mediaType = separatorIndex === -1 ? contentType : contentType.slice(0, separatorIndex);
```

Both arms are reachable and both are covered by inputs a test already wants to
pass. The same trick applies to `at(0)`, `match()[1]` and any destructure of a
`split` or `filter` result: prefer `indexOf` plus `slice`, a regex with a
guaranteed group, or a helper that takes a default.

## A named no-op helper is an equivalent mutant

Stryker mutates a function body to an empty block. For most functions that
changes the result and a test kills it. For a helper whose only job is to
return `undefined`, the two forms are indistinguishable:

```ts
function ignoreRefusal(): undefined {
  return undefined;
}
```

becomes `function ignoreRefusal(): undefined {}`, which behaves identically,
survives every test, and cannot be killed by any test that could ever be
written. Inline it instead, because `() => undefined` is already the form
Stryker mutates arrow bodies *to*, so it produces no mutant of its own:

```ts
await dropEveryCache().catch(() => undefined);
```

## A surviving conditional mutant is usually a design signal

Two `in` guards inside one shared `try`/`catch` both survived:

```ts
try {
  if ('caches' in globalThis) { … }
  if ('serviceWorker' in navigator) { … }
} catch { … } finally { reload(); }
```

Replacing either condition with `true` throws inside the `try`, the shared
`catch` swallows it, and the observable outcome is the same, so no test can
tell the versions apart. That is not a gap in the tests. It is the code
saying that the two guards do not change anything a caller can see, which was
true and was itself the bug: a browser with no Cache Storage skipped the
worker unregistration as well.

Splitting each lever into its own function with its own `catch` made the
difference observable, and the mutants died to a test asserting that a refused
`caches.keys()` still unregisters the worker. Treat a survivor as a question
about the design before treating it as a missing assertion.

## See also

- [`docs/standards/10-testing.md`](../standards/10-testing.md) for what the gates cover and why.
