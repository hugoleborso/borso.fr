---
date: 2026-10-10
introduced-at: implementation
detected-at: linter
severity: low
related-pr: '#153'
fix-pr: '#155'
fix-commits: [4bcf314c]
eradication-level: 1
time-to-detect: minutes
tags: [eslint, cache, pnpm, deps, hooks, harness, pragma]
---

# Two hundred and ninety-one errors for a package that was already installed

## Symptom

On PR #153, merging `main` into the branch brought in a new dependency,
`playwright`, used by four new scripts in `apps/pragma/scripts/task-speed/`.
`pnpm run lint` from `apps/pragma`, run before `pnpm install`, reported:

```
✖ 291 problems (291 errors, 0 warnings)
  Unsafe call of a type that could not be resolved  @typescript-eslint/no-unsafe-call
  Unsafe member access .getByRole on a type that cannot be resolved
```

Those errors were real at that moment: the package was not installed. After
`pnpm install`, `pnpm run typecheck` went clean and `pnpm run lint` printed the
same 291 errors. Deleting `node_modules/.cache/eslint` by hand made them
disappear.

## Root-cause chain

1. **Why did the errors survive the install?**
   Every app's `lint` script ran `eslint --cache` with the cache at
   `node_modules/.cache/eslint`. ESLint keys an entry on the linted file. The
   four scripts did not change between the two runs, so each one was a cache
   hit and replayed the result computed without the package.

2. **Why can the cache not see an install?**
   A type-aware rule's verdict depends on the types the file imports, including
   installed packages, and nothing about `node_modules` is part of the key.
   There is no ESLint option for that.

3. **Why did the hook written for exactly this stay silent?**
   PR #97 shipped `posttool-eslint-cache-replays-a-fixed-error.sh` after the
   second occurrence. It checked `[ -f .eslintcache ]` in the working
   directory. This run was from `apps/pragma`, and the app scripts wrote their
   cache somewhere else. The repository writes ESLint caches in three places
   (`.eslintcache` from pre-commit, `.eslintcache-<name>` from
   `scripts/lint-repository.sh`, `node_modules/.cache/eslint` from the app
   scripts) and the hook knew one.

4. **Why was linting run against a stale install at all?**
   The SessionStart hook installs once. A merge that changes the lockfile
   leaves `node_modules` behind until someone notices, and the first command to
   notice here was the one that caches its findings.

**Root cause:** thought a lint cache only goes stale when code changes, actually
it also goes stale when the installed packages change, so a lint run made
before an install keeps its errors after it.

## Detection failure causes

- **Typing:** `tsc` disagreed with ESLint after the install, which was the
  tell, and the same disagreement was the tell on PR #95.
- **Linter / static analysis:** the linter is where the stale result lived.
- **Harness hook:** existed for this class and looked in the wrong place, see
  step 3.
- **CI:** cannot hit it. CI lints through `scripts/lint-repository.sh` with a
  cache restored under a key that includes the hash of `pnpm-lock.yaml`.

## Countermeasure

- **Code:** deleted the cache and re-ran: 0 errors.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #155](https://github.com/hugoleborso/borso.fr/pull/155) · commit [`4bcf314c`](https://github.com/hugoleborso/borso.fr/commit/4bcf314c)

Every app and infra `lint` script now runs `scripts/lint-workspace.sh`, which
makes the sequence above impossible in two ways. It refuses to lint while
`pnpm-lock.yaml` differs from `node_modules/.pnpm/lock.yaml`, the copy pnpm
writes of the lockfile it installed, so no result is ever computed against a
stale install. And it names the cache file after the digest of that installed
copy, so an install starts a fresh cache instead of inheriting the old one.

```diff
-    "lint": "cd ../.. && eslint apps/pragma --cache --cache-location node_modules/.cache/eslint",
+    "lint": "../../scripts/lint-workspace.sh",
```

```bash
if ! cmp -s "$root/pnpm-lock.yaml" "$installed"; then
  echo "[lint-workspace] the installed dependencies do not match pnpm-lock.yaml." >&2
  exit 1
fi
digest="$(sha256sum "$installed" | cut -c1-12)"
exec pnpm exec eslint "$workspace" "$@" --cache \
  --cache-location "$cache_directory/${cache_prefix}-${digest}"
```

Checked by appending a line to `pnpm-lock.yaml`: `pnpm run lint` exits 1 with
the message, and passes again once the file is restored.

The other half of the class, a fix in one file leaving a dependent file's
cached error in place, has no structural answer, as the PR #97 entry explains.
The hook from PR #97 now resolves the repository root and lists every cache
it finds there, so it fires from an app folder as well, and the command it
prints removes the caches that actually exist.

**Sibling defects swept:** the eight app and infra scripts shared one cache
file, so each run overwrote the others' entries. Each workspace now has its
own file.

## See also

- [`a-cache-replayed-the-error-its-own-entry-described.md`](./a-cache-replayed-the-error-its-own-entry-described.md), the second occurrence and the hook this entry repairs.
- [`eslint-content-cache-replays-a-stale-type-aware-error.md`](../knowledge/eslint-content-cache-replays-a-stale-type-aware-error.md), the first.
- [`eslint-cache-useless-on-a-fresh-checkout.md`](./eslint-cache-useless-on-a-fresh-checkout.md), why the cache is kept at all.
