# `// biome-ignore` only suppresses when on the immediate previous line

Biome's suppression comment is recognised only when it sits on the
**single line directly above** the diagnostic. A multi-line comment
block — even if the *first* line is the `// biome-ignore` directive —
isn't recognised, and the rule fires.

## How it bit us

In PR #8 I wrote:

```ts
// biome-ignore lint/correctness/useExhaustiveDependencies: resetBoard
// captures stable refs through useChessGame's useCallback handles,
// and rerunning it on every render would loop.
useEffect(() => {
  resetBoard();
}, [selectedLine, side]);
```

Biome continued to emit the diagnostic. Reason: the directive line was
*two* lines above `useEffect`, with another `//` comment in between.
Biome only looks one line up.

Fixed by collapsing to a single line:

```ts
// biome-ignore lint/correctness/useExhaustiveDependencies: resetBoard reads the latest selectedLine + side via closure and is intentionally re-run only on those changes.
useEffect(() => {
  resetBoard();
}, [selectedLine, side]);
```

## Why the single-line constraint

Per [biome's docs](https://biomejs.dev/linter/suppressions/),
suppression comments are scoped to the *next non-comment node*. The
parser doesn't treat a sequence of `//` comments as a continuation;
each line is its own comment and only the one immediately preceding
the diagnostic is considered.

Other rules of thumb:

- The directive must include the `<group>/<rule>` slash form
  (`lint/correctness/useExhaustiveDependencies`), not just the rule
  name.
- The descriptive text after `:` is mandatory — biome warns
  `suppressions/missing-description` otherwise.
- For multiple diagnostics on the same line, repeat the directive on
  successive lines (each on a single line, no gaps).

## Detection

The accompanying signal is `lint/suppressions/unused` firing on the
exact `// biome-ignore` line that should have been suppressing the
diagnostic. When you see "this suppression is unused" *and* the
original rule still firing, the comment is in the wrong place.

## Related

- [`biome-stack-overflow-on-dist-binaries.md`](./biome-stack-overflow-on-dist-binaries.md) —
  unrelated Biome-2 quirk worth knowing.
