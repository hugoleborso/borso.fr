---
date: 2026-10-12
introduced-at: conception
detected-at: local
severity: low
related-pr: '#118, #163'
fix-commits: [self]
eradication-level: 2
eradication-paths: [scripts/ensure-infra-built.sh, apps/pragma/package.json, scripts/lint-workspace.sh, scripts/lint-staged-files.sh, .husky/pre-push]
time-to-detect: minutes
tags: [pnpm, tooling, monorepo, agents, typescript, pre-commit]
zone: infra/cdk/package.json
recurs: [a-fresh-session-could-not-typecheck-until-infra-was-built]
---

# The worktree that could not see its own infra

## User impact

In a worktree made for a subagent, `pnpm --filter pragma run typecheck`
failed with `TS2307: Cannot find module '@borso/infra'`. The pre-commit ESLint
run reported unresolved types across every `cdk/` file of talos and
infra/shared. Neither message said that a build was missing. Three agents of
one weekend hit it (measured in their kaizen logs).

| | Seen | Expected |
| --- | --- | --- |
| An agent typechecks in its fresh worktree | `TS2307: Cannot find module '@borso/infra'` | A clean typecheck, or the type errors of its own change |

## Causal chain

- TypeScript could not find `@borso/infra` in the worktree.
  - Its package entry points at a build artefact, and the worktree had no
    `dist/`. From `infra/cdk/package.json`, since `1aa979e74`:

    ```json
    "types": "./dist/index.d.ts",
    "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }
    ```

    - `dist/` is gitignored. In a session, only the SessionStart hook built
      it. `ebabfe765` (2026-08-10) put the build there: "@borso/infra is
      consumed as a built package. A fresh session had no dist… the session
      bootstrap now does the same."
      - SessionStart runs once, in the session's own checkout. A subagent's
        worktree is created later and never runs it.
        - On 2026-08-15, five days after that fix, CLAUDE.md made every
          parallel agent work in its own worktree (`a9c72cedd`). The process
          changed beneath the fix, and nothing re-checked where the
          precondition was met. **Method.**
    - Branch: a build artefact is a precondition of every typecheck only
      because the package exports `dist/`. Each new place a checkout is born
      needs the build again. **Machine.**

## Root cause of occurrence

*Thought a session has one checkout, born before the bootstrap runs,
actually since 2026-08-15 every parallel agent gets a fresh worktree born
after it, and every one of them lacks `dist/`.* **Method**, with a Machine
branch: the `dist/` exports made the build a precondition at all.

This is the third entry on the same precondition, after
[a-fresh-session-could-not-typecheck-until-infra-was-built](./a-fresh-session-could-not-typecheck-until-infra-was-built.md)
and [shared-deploy-stale-dist](./shared-deploy-stale-dist.md).

## Detection failure causes

- **Local validation:** in the main checkout SessionStart had already built
  `dist/`, so the person checking the earlier fix saw green.
- **Local scripts:** `test:core` runs `pnpm --filter @borso/infra run build`
  first, so tests passed in the worktree while `typecheck` and `lint` failed.
  The contrast hid that the precondition lived in some scripts only.
- **CI:** every CI job builds infra explicitly before typechecking, so CI
  never sees a checkout without `dist/`.

## Countermeasure

`scripts/ensure-infra-built.sh` builds `@borso/infra` when `dist/index.d.ts`
is missing or older than any file under `infra/cdk/src`. Otherwise it costs
one `find`. A lock per checkout keeps the parallel typecheck gates of
pre-push from building at once. It says what it is doing when it builds.

## Eradication

**Type:** DevX check (level 2)

**Reference:** [PR #173](https://github.com/hugoleborso/borso.fr/pull/173),
commit `e51cfdd5a`, which ships this entry.

Every `typecheck` script of an app and of infra/shared,
`scripts/lint-workspace.sh`, `scripts/lint-staged-files.sh` (the pre-commit
ESLint step) and `.husky/pre-push` call it first. So at commit and push the
precondition is met in any checkout.

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

The level is 2, not 1. The call sites are kept by hand. A new script that
reads `@borso/infra` types and forgets the call fails the same way.

**Proof it can fail:** run in this kaizen's own fresh worktree, the first
call printed why and built `dist/`. The second returned silently. Without
the call, the same typecheck failed with `TS2307`.

**Proposed:** subtract the precondition. Add a source export condition to
`infra/cdk/package.json`, such as `"@borso/source": "./src/index.ts"`, and
set `customConditions: ["@borso/source"]` in the consuming tsconfigs. Both
`Bundler` and `NodeNext`, the two resolutions the apps use, read it. Typecheck
and lint would then resolve source, and their calls to
`ensure-infra-built.sh` could go. A new script could not forget a
precondition that no longer exists. `synth` and `deploy` run the built
package, so they keep their build (inferred: the `.code.js` files the
constructs read are copied into `dist/` by `build`).

**Similar instances:** `grep -ln ensure-infra-built apps/*/package.json
infra/*/package.json` lists the eight `typecheck` callers. `test:core`
already builds. The change to `package.json` is a check-only script, so the
deploy filters from PR #168 do not redeploy any app for it.
