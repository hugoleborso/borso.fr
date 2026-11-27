---
date: 2026-08-08
introduced-at: conception
detected-at: ci
severity: medium
related-pr: '#40'
fix-commits: [cbc90eca88, 9dcf74547]
eradication-level: 1
eradication-paths: [.github/workflows/ci.yml, .husky/pre-commit]
time-to-detect: hours
tags: [eslint, ci, cache, github-actions, gates, performance]
zone: .github/workflows/ci.yml
---

# The ESLint cache saved and restored correctly, and did nothing

## User impact

Every pull request waited on a CI `build` job that the lint cache was
meant to shorten and did not. Three runs after the Biome-to-ESLint
migration took 177 s, 206 s and 183 s, with a cache hit each time.

| Step of the `build` job | Seen | Expected |
| --- | ---: | ---: |
| restore `.eslintcache` | 1 s, hit | hit |
| `eslint . --cache` | 68 s | about 3 s, the warm figure on the development sandbox |

Measured from the per-step timings of those runs, by the session that
ran the migration.

## Causal chain

- The lint step took 68 s on a restored cache.
  - ESLint re-linted every file and rebuilt the TypeScript program for every workspace, as on a cold run.
    - ESLint's `--cache` defaults to `cacheStrategy: "metadata"`, which treats a file as unchanged only if its mtime and size match the cache.
      - `actions/checkout` writes every file fresh, so every mtime is later than the cache entry.

        ```yaml
        # .github/workflows/ci.yml at 314f24821
        - run: pnpm exec eslint . --cache --cache-location .eslintcache
        ```

        - Commit 314f24821 ("replace biome with eslint and prettier", 2026-08-08) wrote it. Its message sizes the cache from the sandbox: "A warm cache brings it to 3.2 s, so CI now persists `.eslintcache`". On the sandbox the files keep their mtimes between runs, so the metadata check passes there.

## Root cause of occurrence

*Thought a restored `.eslintcache` spares the re-lint wherever it is
restored, actually ESLint's default cache compares each file's mtime, and
a fresh checkout rewrites every mtime, so on a runner the cache matches
nothing.*

Tag: **Material** (agentic rule). The only measurement in the agent's
context was the sandbox's, where mtimes survive between runs. Nothing in
its context described `--cache-strategy` or how a checkout sets mtimes.

## Detection failure causes

- **CI logs:** `Cache saved with key: lint-cache-…` and the matching restore line read as success. Neither says how many files the cache spared.
- **The workflow comment:** it claimed a warm cache brings the step to about 3 s, true on the sandbox and false on a runner. With that number written down, 68 s read as the cost of type-aware linting.
- **The timings document:** it left the warm CI figure out "because it needs a second run on the same cache key", so the one measurement that would have shown the gap was deferred.

## Countermeasure

Commit cbc90eca88 added `--cache-strategy content`, which hashes file
contents. A fresh checkout gives byte-identical files, so the hashes
match. On the first run with it (`a0347ea`) the lint step went from 68 s
to 3 s and the `build` job from 183 s to 139 s (measured).

## Eradication

**Type:** structural impossibility (level 1), by subtraction.

**Reference:** commit [`9dcf74547`](https://github.com/hugoleborso/borso.fr/commit/9dcf74547)
(PR #197) replaced ESLint with oxlint in CI and in the hooks, and removed
the `.eslintcache` step from `ci.yml`.

```diff
-          key: lint-cache-${{ hashFiles('pnpm-lock.yaml', 'eslint.config.js', '.prettierrc.json') }}-${{ github.sha }}
```

What cbc90eca88 shipped, the flag on every ESLint call, no longer exists,
because no ESLint call does. `.github/workflows/ci.yml` and
`.husky/pre-commit` now hold no ESLint invocation and no `--cache` flag
(measured, `grep -rn -- "--cache\|eslint \." .github/workflows .husky
package.json` finds only `git diff --cached`). ESLint stays a dev
dependency for the `RuleTester` suites of `eslint-rules/`, which keep no
cache. A metadata cache that a checkout invalidates cannot recur in lint,
since lint keeps no cache.

**Proof it can fail:** not applicable. The class went with the cache, so
there is nothing left to plant.

**Similar instances:** the remaining `actions/cache` entries in
`ci.yml` and `full-suite.yml` hold Stryker's `incremental.json`, keyed on
`hashFiles(...)` of the sources and configs. A content-hash key does not
depend on mtimes.
