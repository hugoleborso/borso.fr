# TypeScript loses narrowing inside `function` declarations, keeps it inside arrow expressions

Inside a function scope, TypeScript narrows a `const`-bound variable
after an early-return guard:

```ts
const container = containerRef.current;
if (!container) return;
// container is HTMLDivElement here, not HTMLDivElement | null
```

That narrowing **survives into arrow-function expressions** declared
*after* the guard, because they capture the binding at their lexical
position (after narrowing). It **doesn't survive into `function`
declarations** in the same scope, because function declarations get
hoisted to the top of the enclosing function for type-checking
purposes — they read the variable's pre-narrow type.

## How it bit borso.fr

`apps/borso-fr/site/components/Galaxy.tsx` originally had:

```ts
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  // … 80 lines of WebGL setup …

  function resize() {
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    //                ^^^^^^^^^ TS18047: 'container' is possibly 'null'
  }

  function handleMouseMove(e) {
    const rect = container.getBoundingClientRect();
    //           ^^^^^^^^^ TS18047: 'container' is possibly 'null'
  }
}, [/* deps */]);
```

`tsc --noEmit` produced three TS18047 errors even though the early
return clearly narrowed `container` to non-null. The reason is the
`function` declarations: TypeScript hoists them, type-checks them
against the *pre-narrow* type of `container`, and reports it as
possibly-null inside.

## The fix

Convert the inner `function` declarations to `const … = (…) => { … }`
arrow expressions:

```diff
-function resize() {
-  renderer.setSize(container.offsetWidth, container.offsetHeight);
-}
+const resize = () => {
+  renderer.setSize(container.offsetWidth, container.offsetHeight);
+};
```

Arrow expressions are bound at the point of assignment, not hoisted.
TypeScript sees them inside the narrowed flow and preserves the
narrowing. No casts needed (`as Foo` is banned in this repo anyway by
the `no-type-assertion-except-unknown` plugin).

The repo's *Clean code* rule says no abbreviations / single-letter
locals, so when converting `function update(t) { … }` to
`const update = (timestamp: number) => { … }` was the natural moment
to also rename `t` to `timestamp` and `cw`/`ch` to `pixelWidth` /
`pixelHeight`.

## Why this is non-obvious

`function` declarations are usually interchangeable with arrow
expressions for runtime purposes. They differ on:

- **Hoisting** (function declarations hoist; expressions don't).
- **`this` binding** (function declarations have their own `this`;
  arrows inherit from enclosing scope).
- **TypeScript narrowing in closures** — this entry's lesson.

The narrowing failure is silent until `tsc` runs. Biome won't catch it;
the runtime works fine. Only `tsc --noEmit` sees the problem.

## Rule of thumb

Inside a callback (especially `useEffect` or other long-lived
closures) where you've early-returned to narrow a binding, **use arrow
expressions for inner helpers**. Save the `function` declaration form
for top-level utilities where there's no flow-narrowing to preserve.

## See also

- [`docs/dantotsus/described-screenshot-without-checking-pixels.md`](../dantotsus/described-screenshot-without-checking-pixels.md)
  — different family, but same shape: TypeScript-passing code that's
  still wrong about reality.
