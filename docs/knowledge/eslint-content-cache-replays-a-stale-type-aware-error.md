---
summary: '`--cache-strategy content` keys on the linted file, so a type-aware error you already fixed is replayed; remove the ESLint caches and lint again.'
triggers:
  output:
    - '(^|\n)[ \t]*\d+:\d+[ \t]+error[ \t].*@typescript-eslint/no-unsafe-(argument|assignment|call|member-access|return)[ \t]*(\n|$)'
---

# The ESLint content cache replays a type-aware error after you fixed it

This repository stopped running ESLint on 2026-10-27, when oxlint replaced it
([ADR-0045](../adr/0045-oxlint-and-oxfmt-replace-eslint-and-prettier.md)), and
oxlint keeps no cache. The entry stays for the repositories that use the
harness and still lint with ESLint, and its trigger matches only a line of
ESLint's own report, because a grep of the standards printing a rule name is
not an error. Until then `.husky/pre-commit` ran

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

The same replay happens when the *installed packages* change rather than the
code: a lint run made before `pnpm install` caches errors about types it could
not resolve, and replays them after the install. The app and infra `lint`
scripts go through `scripts/lint-workspace.sh`, which refuses to run on a stale
install and starts a new cache after each one; see
[`the-cache-outlived-the-install-it-was-built-against.md`](../dantotsus/the-cache-outlived-the-install-it-was-built-against.md).
The caches this repository writes are `.eslintcache`, `.eslintcache-<name>` and
`node_modules/.cache/eslint-workspaces/`.
