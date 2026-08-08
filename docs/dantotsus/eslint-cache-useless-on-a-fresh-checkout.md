---
date: 2026-08-08
introduced-at: conception
detected-at: measurement
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-commits: []
eradication-level: 1
time-to-detect: hours
tags: [eslint, ci, cache, github-actions, gates, performance]
---

# The ESLint cache saved and restored correctly, and did nothing

## Symptom

The Biome-to-ESLint migration made a cold repository-wide lint go from 3.5 s to
80.7 s. The plan was to absorb that with a cache: `.eslintcache` persisted by
`actions/cache`, keyed on the lockfile and the two config files, restoring on
every run whose configuration had not changed.

Three `build` runs later, the job was 177 s, 206 s and 183 s. The cache hit, the
cache saved, and the job did not get faster.

The per-step timings said why:

| Step | Duration |
|------|---------:|
| `pnpm install --frozen-lockfile` | 4 s |
| `pnpm -r typecheck` | 34 s |
| restore `.eslintcache` | 1 s |
| **`eslint . --cache`** | **68 s** |
| `prettier --check . --cache` | 4 s |

68 s on a restored cache, against 3.2 s for the same command warm on the
development sandbox. The cache was present and being ignored.

## Root-cause chain

1. ESLint's `--cache` defaults to `cacheStrategy: "metadata"`, which decides a
   file is unchanged by comparing its **mtime and size** against what the cache
   recorded.
2. `actions/checkout` writes every file fresh. Every mtime in the working tree
   is the moment of checkout, which is always later than the moment the cache
   entry was written.
3. So every file looked modified, every file was re-linted, and the type-aware
   rules rebuilt the TypeScript program for every workspace, exactly as on a
   cold run.
4. Nothing reported this. A cache that restores and then matches zero entries
   behaves identically to a cache that restores and matches everything, except
   in wall-clock — and wall-clock was being attributed to "type-aware linting is
   just slow".

The same trap applies locally, less visibly: `git checkout` of another branch
rewrites the mtime of every file it touches, so switching branches threw the
cache away too.

## Detection failure causes

- **The cache was verified by its logs, not by its effect.** `Cache saved with
  key: lint-cache-…` and a matching restore line read as success. Neither says
  how many files the cache spared.
- **The expected number was written down before it was measured.** The CI
  workflow carried a comment claiming "a warm cache brings it back to about 3 s",
  which is true on a development machine and false on a runner. Once the comment
  existed, the 68 s step looked like the cost of type-aware linting rather than a
  defect.
- **The timings document said the warm CI figure was "deliberately absent
  because it needs a second run on the same cache key".** That framing treated
  the missing number as a scheduling problem. Taking the measurement is what
  found the bug; deferring it is what hid it.

## Countermeasure

`--cache-strategy content` makes ESLint hash file contents instead of stating
mtime and size. A fresh checkout produces byte-identical files, so the hashes
match and the cache applies.

The cost is hashing every file on every run, which is small next to building a
TypeScript program per workspace.

## Eradication

**Level 1 — structural.** The flag is on every ESLint invocation in the
repository, so there is no path that uses the default strategy:

- `.github/workflows/ci.yml`, the repository-wide lint step
- `package.json`, the `lint` and `lint:fix` scripts
- `.husky/pre-commit`, the staged-file lint

The CI workflow comment now states the reason and the measured number, so the
next person to read it does not re-derive the wrong expectation.

## What to check next time

When a cache does not deliver, ask what the cache compares before asking whether
it restored. Both `.eslintcache` and Prettier's cache default to comparing
metadata, and every CI runner starts by rewriting all of it. Prettier exposes the
same choice as `--cache-strategy content`; it stays on the default here only
because its step is 4 s and not worth the hashing.
