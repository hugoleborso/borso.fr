---
date: 2026-08-10
introduced-at: implementation
detected-at: local
severity: low
related-pr: 36
fix-pr: 45
fix-commits: [ebabfe7]
eradication-level: 2
time-to-detect: minutes
tags: [pnpm, ci, hooks, session-start, tooling, monorepo]
---

# A fresh session could not typecheck until infra was built

## Symptom

Running an app's typecheck in a fresh session fails on a module that has
nothing to do with the change in hand:

```
cdk/bin/cdk.ts(24,8): error TS2307: Cannot find module '@borso/infra' or its corresponding type declarations.
cdk/lib/stack.ts(19,63): error TS2307: Cannot find module '@borso/infra' or its corresponding type declarations.
```

First written up in PR #37 (June 2026), against a change entirely under
`apps/pragma/site/**`. The remedy is `pnpm --filter @borso/infra run
build`, after which the same typecheck passes untouched.

**It is still live.** Writing this very kaizen PR needed that build by
hand, twice, before any infra test would run — a fresh remote session, a
clean checkout, no `dist/`. PR #37 diagnosed it correctly and never
merged, so the fix has been sitting in an open branch for two months while
every session paid the toll.

## Root-cause chain

1. **Why does typecheck fail?** `@borso/infra` is consumed by package
   entry, and its entry points at `dist/`. Every app's `cdk/` imports its
   types.
2. **Why is there no `dist/`?** `scripts/install-repo-deps.sh` ran
   `pnpm install` and stopped. A remote session starts from a clean
   checkout, where `dist/` has never existed.
3. **Why does CI not hit it?** `ci.yml` runs
   `pnpm --filter @borso/infra build` before `pnpm -r typecheck`, and
   again in every `app-tests` job before the suites. The session bootstrap
   mirrored neither.

**Root cause:** *thought `pnpm install` leaves the workspace ready to
typecheck, actually `@borso/infra` is a build-output dependency — its
consumers cannot resolve it until `dist/` exists, and only CI knew to
build it first.*

## Detection failure causes

- **Typing:** this *is* the typing layer, reporting correctly. The defect
  was environmental, not in any diff.
- **CI:** permanently green, because CI builds infra first. The divergence
  between CI's bootstrap and the session's bootstrap is the blind spot,
  and a CI that compensates for a missing step is a CI that hides it.
- **Code review:** nothing in any diff was wrong.
- **Harness:** the SessionStart banner reports what it installed and said
  nothing about a build it never attempted. Absence of a step is not an
  error anything reports.

## Countermeasure

- **Code:** commit `ebabfe7` — `scripts/install-repo-deps.sh` builds
  `@borso/infra` right after `pnpm install`.

## Eradication (mandatory — code-level)

**Type:** DevX check (level 2 — the session environment is brought into
line with CI, so an app typecheck resolves `@borso/infra` from a clean
checkout)

**Reference:** [PR #45](https://github.com/hugoleborso/borso.fr/pull/45) ·
commit [`ebabfe7`](https://github.com/hugoleborso/borso.fr/commit/ebabfe7)

**The actual fix:**

```diff
 log "running pnpm install"
 pnpm install --frozen-lockfile
+
+log "building @borso/infra (its dist is what app cdk typechecks resolve)"
+pnpm --filter @borso/infra run build ||
+  note_missing '@borso/infra dist' "@borso/infra did not build. Every app cdk typecheck and cdk/test/stack.test.ts will fail on \"Cannot find module '@borso/infra'\" until you run: pnpm --filter @borso/infra run build"
```

Two deliberate choices, both from dantotsus this repo already owns:

- **Unconditional, not guarded on `dist/` existing** — a *stale* dist is
  its own hazard, and skipping the build when a directory happens to be
  present is how that one starts.
- **Reported through `note_missing`, not `|| true`** — a failure lands in
  the SessionStart banner an agent actually reads, and does not abort the
  rest of the bootstrap.

**Sibling defects swept:** none — one missing bootstrap step.

## See also

- [`shared-deploy-stale-dist.md`](./shared-deploy-stale-dist.md) — the
  inverse hazard, and why this build is unconditional.
- [`one-failed-optional-install-silently-dropped-four-tools.md`](./one-failed-optional-install-silently-dropped-four-tools.md)
  — why the failure path uses `note_missing` and prints to stdout.
- [`preexisting-is-not-an-excuse.md`](./preexisting-is-not-an-excuse.md) —
  why a build prerequisite belongs in the bootstrap rather than being
  waved past as somebody else's red build.
- [`pnpm-reserved-script-names.md`](./pnpm-reserved-script-names.md) — why
  the fix says `run build`.
