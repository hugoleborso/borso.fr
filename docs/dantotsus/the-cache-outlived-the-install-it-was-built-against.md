---
date: 2026-10-10
introduced-at: implementation
detected-at: linter
severity: low
related-pr: '#153'
fix-commits: [24b9318ef, 9dcf74547]
eradication-level: 1
time-to-detect: minutes
tags: [eslint, cache, pnpm, deps, hooks, harness, pragma]
eradication-paths: [scripts/lint-workspace.sh]
zone: scripts/lint-workspace.sh
recurs: [a-cache-replayed-the-error-its-own-entry-described]
---

# Two hundred and ninety-one errors for a package that was already installed

## User impact

On PR #153, merging `main` brought in a new dependency, `playwright`, used by
four new scripts in `apps/pragma/scripts/task-speed/`. `pnpm run lint` from
`apps/pragma`, run before `pnpm install`, reported 291 errors, which were real
at that moment. After the install, typecheck went clean and lint did not.

| | Seen | Expected |
| --- | --- | --- |
| `pnpm run lint` after `pnpm install` | `✖ 291 problems (291 errors, 0 warnings)`, `no-unsafe-call` on types that could not be resolved | 0 errors, as `pnpm run typecheck` reported |

Measured by the PR #153 session. Deleting `node_modules/.cache/eslint` by hand
made the errors disappear.

## Causal chain

- Lint reported 291 errors after the package was installed.
  - ESLint replayed the results it had computed before the install. The four
    scripts had not changed, so each was a cache hit.
    - Every app's `lint` script ran ESLint with a cache keyed on each file's
      own content:
      ```json
      "lint": "cd ../.. && eslint apps/pragma --cache --cache-location node_modules/.cache/eslint"
      ```
      - A type-aware verdict depends on the types a file imports, installed
        packages included, and nothing about `node_modules` is part of an
        ESLint cache key. No ESLint option adds it.
        - `314f24821` (2026-08-08) put the cache in front of the type-aware
          rules when ESLint replaced Biome. A cold repository-wide lint had
          gone from 3.5 s to 80.7 s
          ([eslint-cache-useless-on-a-fresh-checkout](./eslint-cache-useless-on-a-fresh-checkout.md)),
          and the cache was the answer to that cost. (Machine)
  - The lint ran against a stale install. SessionStart installs once, and the
    merge changed the lockfile without reinstalling.

## Root cause of occurrence

*Thought a lint cache goes stale only when the linted file changes, actually a
type-aware result also goes stale when anything the file imports changes,
installed packages included.* (Machine)

The deeper condition is the tool, not one belief. A content-keyed cache in
front of type-aware rules can never see a change in what a file imports. This
is the third occurrence of that one class. The first was recorded in
[`eslint-content-cache-replays-a-stale-type-aware-error`](../knowledge/eslint-content-cache-replays-a-stale-type-aware-error.md),
the second in
[a-cache-replayed-the-error-its-own-entry-described](./a-cache-replayed-the-error-its-own-entry-described.md).
Each earlier fix kept the cache and added a guard beside it.

## Detection failure causes

- **Typing:** `tsc` disagreed with ESLint after the install. That
  disagreement was the tell here and on PR #95, and nothing compares the two.
- **Harness hook:** `posttool-eslint-cache-replays-a-fixed-error.sh`, shipped
  after the second occurrence, checked `[ -f .eslintcache ]` in the working
  directory. The repository wrote ESLint caches in three places, and the app
  scripts wrote theirs under `node_modules/.cache/eslint`, which the hook did
  not look at.
- **CI:** cannot hit it. CI restored its cache under a key that included the
  hash of `pnpm-lock.yaml`.

## Countermeasure

The cache was deleted and lint re-ran: 0 errors.

## Eradication

**Type:** structural impossibility by subtraction (level 1)

**Reference:** commit [`9dcf74547`](https://github.com/hugoleborso/borso.fr/commit/9dcf74547) (#197, 2026-10-27)

The first eradication, `24b9318ef`, kept the cache. It refused to lint while
`pnpm-lock.yaml` differed from `node_modules/.pnpm/lock.yaml`, and named the
cache after the installed lockfile's digest. That added two guards around the
cache and removed nothing.

`9dcf74547` replaced ESLint with oxlint and deleted the cache. A run with no
cache has nothing to replay, so a stale result cannot exist. Today's
`scripts/lint-workspace.sh` says so in its header:

```bash
# There is no cache. ESLint's was keyed on each file's own bytes, so a
# type-aware error replayed after the types it depended on were fixed, three
# times in this repository …
# oxlint lints a workspace in seconds, so a cache has nothing left to save.
```

The lockfile refusal went with the cache. A stale install is now handled by
`scripts/ensure-installed.sh lint`, which the same script calls before oxlint.

**Similar instances:** `git grep -n -e '--cache\b' -e 'eslintcache' -- scripts .husky package.json 'apps/*/package.json' 'infra/*/package.json' .github`
finds no lint cache, only the tests of the harness hook
`scripts/hooks/checks/eslint-cache-replays-a-fixed-error.core.ts`. `9dcf74547`
kept that hook on purpose, "for repositories still on ESLint".
