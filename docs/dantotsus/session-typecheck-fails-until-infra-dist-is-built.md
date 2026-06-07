---
date: 2026-06-07
introduced-at: implementation
detected-at: local
severity: low
related-pr: 36
fix-pr: 37
fix-commits: [cadddea]
eradication-level: 2
time-to-detect: minutes
tags: [ci, pnpm, hooks, session-start, infra, typecheck]
---

# typecheck failed in a fresh session because @borso/infra was never built

## Symptom

Running `pnpm run typecheck` in `apps/pragma` during PR #36 failed:

```
cdk/bin/cdk.ts(24,8): error TS2307: Cannot find module '@borso/infra' or its corresponding type declarations.
cdk/lib/stack.ts(19,63): error TS2307: Cannot find module '@borso/infra' or its corresponding type declarations.
```

The change under test was entirely in `apps/pragma/site/**` — nothing to
do with cdk — yet typecheck was red. The fix was to run
`pnpm --filter @borso/infra build` first; typecheck then passed
unchanged. A detour with no relation to the actual work.

## Root-cause chain

1. **Why did typecheck fail?** `@borso/infra` is consumed as a built
   package (`dist/`), and `apps/pragma/cdk` imports its types. With no
   `dist/`, TypeScript can't resolve the module.
2. **Why was there no `dist/`?** The SessionStart bootstrap
   (`scripts/install-repo-deps.sh`) ran `pnpm install` but never built
   `@borso/infra`. A fresh remote session starts from a clean checkout,
   so `dist/` simply doesn't exist.
3. **Why does it work in CI but not the session?** CI runs
   `pnpm --filter @borso/infra build` *before* `pnpm -r typecheck`
   (`.github/workflows/ci.yml`). The session bootstrap didn't mirror
   that ordering.

**Root cause:** *thought "`pnpm install` makes the workspace ready to
typecheck", actually `@borso/infra` is a build-output dependency — its
consumers can't typecheck until its `dist/` exists, and only CI knew to
build it first.*

## Detection failure causes

- **Typing:** this *is* the typing layer — it correctly reported the
  missing module; the gap was environmental, not in the code.
- **CI:** green, because CI builds infra first. The divergence between
  CI's bootstrap and the session's bootstrap is exactly the blind spot.
- **Code review:** N/A — nothing in the diff was wrong.

## Countermeasure

Mirror CI's first build step in the session bootstrap: build
`@borso/infra` right after `pnpm install`, non-fatally.

- **Code:** commit `cadddea` — `scripts/install-repo-deps.sh`.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the session environment is brought in
line with CI, so an app typecheck resolves `@borso/infra` out of the
box; a build hiccup logs a warning rather than bricking session start).

**Reference:** [PR #37](https://github.com/hugoleborso/borso.fr/pull/37) ·
commit [`cadddea`](https://github.com/hugoleborso/borso.fr/commit/cadddea)

**The actual fix:**

```diff
 log "running pnpm install"
 pnpm install --frozen-lockfile
+
+# 3b. Build @borso/infra so a fresh session's `pnpm -r typecheck` ...
+log "building @borso/infra (its dist is consumed by app cdk typechecks)"
+pnpm --filter @borso/infra build || log "WARNING: @borso/infra build failed; run 'pnpm --filter @borso/infra run build' before typecheck"
```

**Sibling defects swept:** none — single-step bootstrap gap.

## See also

- [`shared-deploy-stale-dist.md`](./shared-deploy-stale-dist.md) — the
  inverse hazard: a *stale* `dist/` served instead of a *missing* one.
  Building unconditionally at session start (rather than guarding on
  `dist/` presence) avoids reintroducing that staleness.
- [`preexisting-is-not-an-excuse.md`](./preexisting-is-not-an-excuse.md)
  — why the build prerequisite belongs in the bootstrap, not waved past
  as "someone else's red build".
