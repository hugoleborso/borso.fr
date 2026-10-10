---
date: 2026-10-02
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#110'
fix-pr: '#119'
fix-commits: [3d7adaa065]
eradication-level: 1
eradication-paths: [scripts/lint-repository.sh]
time-to-detect: days
tags: [ci, eslint, gates, banana-rush]
zone: .github/workflows/ci.yml
---

# Five apps did not fit in one lint heap

## Symptom

From PR #110 onwards, every push to main ended with a red `build` job:

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command was killed with SIGABRT (Aborted): eslint . --max-warnings 0 --cache …
```

Four consecutive runs on main failed the same way, and the PR #119 kaizen
branch inherited it.

## Root-cause chain

1. **Why did ESLint die?** It reached Node's default heap limit of about
   4 GB on the runner.
2. **Why did it need that much?** The configuration is type-aware: before
   any rule runs, typescript-eslint builds a TypeScript program for each
   tsconfig it meets. `eslint .` meets every workspace's tsconfigs and keeps
   all their programs alive in one process until it exits.
3. **Why now?** PR #110 added banana-rush, the fifth application, with
   three tsconfigs of its own. The sum crossed the limit, while each
   workspace alone stays under it — pragma, the largest, lints in 73 s
   under the same 4 GB.
4. **Why did PR #110 merge with it?** Its own `ci` runs were green on the
   branch (run 35540614177 among them), and the first run on main was red.
   The likeliest difference is the ESLint cache: a pull-request run restores
   one, and a warm cache spares the type-aware pass most files, while the run
   on main started from a different key. That explanation is not verified
   from here; what is verified is that a cold whole-repository run exhausts
   a 4 GB heap.

**Root cause:** thought one `eslint .` grew with the repository linearly
and harmlessly, actually its memory is the sum of every workspace's
TypeScript program, and the fifth application tipped it over a fixed
ceiling.

## Detection failure causes

- **CI:** it did detect it, on main, and nothing acted on four red runs.
- **Local:** pre-commit lints staged files only, so no local command ever
  ran the whole repository in one process.
- **Cache:** if the explanation above holds, a warm cache hides the
  cold-run cost, so a green pull-request run says little about main's.

## Countermeasure

- **Code:** commit `3d7adaa` replaces the single run with
  `scripts/lint-repository.sh`.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** commit `3d7adaa`

**The actual fix:** one ESLint process per directory under `apps/` and
`infra/`, then one for everything else with those two ignored. Each
process frees its programs when it exits, so the peak is the largest
workspace rather than the sum:

```diff
-      - run: pnpm exec eslint . --max-warnings 0 --cache --cache-strategy content --cache-location .eslintcache
+      - run: scripts/lint-repository.sh
```

Reproduced locally with `--max-old-space-size=4096`: `eslint .` dies at
215 s, the split passes cold in 190 s, and errors planted in an app and in
`scripts/` both fail it. Coverage is the whole repository by construction,
and a sixth application is linted in its own process without an edit, so
adding apps can no longer exhaust a shared heap.

Raising the heap was rejected: it moves the ceiling by an amount that
depends on the runner's memory, which nothing in this repository can see.

**Sibling defects swept:** `pnpm run lint` and `lint:fix` called the same
single run and now call the script.

## See also

- [`the-hook-that-was-missing-from-its-own-contract.md`](./the-hook-that-was-missing-from-its-own-contract.md) — found in the same sweep.
