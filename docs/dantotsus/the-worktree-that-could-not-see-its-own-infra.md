---
date: 2026-10-12
introduced-at: conception
detected-at: local
severity: low
related-pr: '#118, #163'
fix-pr: '#173'
fix-commits: [self]
eradication-level: 1
eradication-paths: [scripts/ensure-infra-built.sh, apps/pragma/package.json, scripts/lint-workspace.sh, .husky/pre-commit, .husky/pre-push]
time-to-detect: minutes
tags: [pnpm, tooling, monorepo, agents, typescript, pre-commit]
zone: infra/cdk/package.json
recurs: [a-fresh-session-could-not-typecheck-until-infra-was-built]
---

# The worktree that could not see its own infra

## Symptom

In a worktree made for a subagent, `pnpm --filter pragma run typecheck`
failed with `TS2307: Cannot find module '@borso/infra'`, and the pre-commit
ESLint run reported unresolved types across every `cdk/` file of talos and
infra/shared. Neither message said that a build was missing. Three agents of
one weekend hit it.

## Root-cause chain

1. **Why could TypeScript not find `@borso/infra`?** Its package entry is
   `dist/index.d.ts`, and the worktree had no `dist/`.
2. **Why not?** `dist/` is gitignored, and the only thing that built it in a
   session was the SessionStart hook, after the fix recorded in
   `a-fresh-session-could-not-typecheck-until-infra-was-built`.
3. **Why did that fix not reach the worktree?** SessionStart runs once, in
   the session's checkout. A subagent's worktree is created later and never
   runs it.
4. **Why did `test:core` work?** It runs `pnpm --filter @borso/infra run
   build` first; `typecheck` and `lint` did not.

**Root cause:** the earlier fix assumed one session meant one checkout, so it
built the dependency at session start, but every worktree is a new checkout
and the scripts that need `dist/` did not build it themselves.

## Detection failure causes

- **Functional validation locally:** in the main checkout SessionStart had
  already built `dist/`, so the person checking the fix saw green.
- **CI:** every CI job builds infra explicitly before typechecking.

## Countermeasure

`scripts/ensure-infra-built.sh` builds `@borso/infra` when `dist/index.d.ts`
is missing or older than any file under `infra/cdk/src`, and costs one `find`
otherwise. A lock per checkout keeps the parallel typecheck gates of pre-push
from building at once. Every `typecheck` script of an app and of infra/shared,
`scripts/lint-workspace.sh`, the pre-commit ESLint step and pre-push call it
first, and it says what it is doing when it builds.

## Eradication (mandatory — code-level)

**Type:** code diff (level 1 — structural impossibility)

**Reference:** [PR #173](https://github.com/hugoleborso/borso.fr/pull/173) · commit `self` (this entry ships with it)

**The actual fix:**

```diff
-    "typecheck": "tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit",
+    "typecheck": "../../scripts/ensure-infra-built.sh && tsc -p tsconfig.cdk.json --noEmit && tsc --noEmit",
```

```bash
is_current() {
  [ -f "$entry" ] &&
    [ -z "$(find "$package/src" \( -name '*.ts' -o -name '*.js' \) -newer "$entry" -print -quit)" ]
}
```

Run in this kaizen's own fresh worktree: the first call printed why and built
`dist/`; the second returned silently.

**Sibling defects swept:** the same seven `typecheck` scripts (six apps and
infra/shared); `test:core` already builds. The change to `package.json` is a
check-only script, so the deploy filters from PR #168 do not redeploy any
app for it.

## See also

- [`a-fresh-session-could-not-typecheck-until-infra-was-built.md`](./a-fresh-session-could-not-typecheck-until-infra-was-built.md)
- [`shared-deploy-stale-dist.md`](./shared-deploy-stale-dist.md), why a stale `dist/` is rebuilt rather than trusted.
