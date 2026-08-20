# The ESLint content cache replays a type-aware error after you fixed it

`.husky/pre-commit` runs

```bash
eslint --cache --cache-strategy content --cache-location .eslintcache
```

`--cache-strategy content` keys each entry on **the linted file's own content**.
That is correct for a syntactic rule: if the file has not changed, its result
has not changed.

It is wrong for a type-aware rule, whose result depends on every file in the
type graph. Fix a return type in `a.ts`, and `b.ts` — unchanged, so a cache hit
— still reports the error that the fix removed. The message names `b.ts` and a
line that is now correct, and re-running does not help because the cache hits
again.

There is no flag for "invalidate on the project, not the file". The way out is
to delete the cache:

```bash
rm -f .eslintcache
```

Reach for that the moment an ESLint error describes code that is no longer
there. It is not a stale editor, and it is not a bad fix.

`--cache-strategy metadata` (mtime-based) has the same flaw for the same reason;
the dependency is on the type graph either way.

The cache is worth keeping despite this — the measurement behind that choice is
in
[`eslint-cache-useless-on-a-fresh-checkout.md`](../dantotsus/eslint-cache-useless-on-a-fresh-checkout.md),
which is about the other half of the story, a cache that hit and saved nothing.
