---
date: 2026-08-10
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#36'
fix-commits: [ebabfe7650]
eradication-level: 2
eradication-paths: [scripts/install-repo-deps.sh, scripts/ensure-infra-built.sh]
time-to-detect: minutes
tags: [pnpm, ci, hooks, session-start, tooling, monorepo]
zone: scripts/install-repo-deps.sh
---

# A fresh session could not typecheck until infra was built

## User impact

Every fresh remote session that ran an app's typecheck failed on a module unrelated to its change:

```
cdk/bin/cdk.ts(24,8): error TS2307: Cannot find module '@borso/infra' or its corresponding type declarations.
cdk/lib/stack.ts(19,63): error TS2307: Cannot find module '@borso/infra' or its corresponding type declarations.
```

| | Seen | Expected |
| --- | --- | --- |
| App typecheck in a fresh session | TS2307 on every `cdk/` file | The typecheck passes, as it does after `pnpm --filter @borso/infra run build` with no other change |

PR #37 (June 2026) first wrote it up, against a change entirely under `apps/pragma/site/**`, and never merged. The kaizen PR that wrote this entry needed the same build by hand twice (measured in that session).

## Causal chain

- An app typecheck failed with TS2307 on `@borso/infra`.
  - `infra/cdk/dist/` did not exist. A remote session starts from a clean checkout, and `dist/` is gitignored.
    - `scripts/install-repo-deps.sh` ran `pnpm install --frozen-lockfile` and stopped. It built nothing.
      - The build step lived in each place that needed it, and the session bootstrap was not one of them. 6266f4d7b, "fix(ci): build @borso/infra before typecheck so consumers resolve", added the build to `ci.yml` alone. Its message says "matches the pattern already in deploy.yml".
        - Every consumer needs a build because the package entry of `@borso/infra` is its build output, since its port in 1aa979e74 (Machine):

          ```json
          "types": "./dist/index.d.ts",
          "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }
          ```

## Root cause of occurrence

*Thought the TS2307 in CI was a step missing from one workflow, so the fix was to copy the build step there. Actually the package entry points at a build output, so every place that typechecks needs that step, and each copy left out is the same failure.* (Machine)

The commit message of 6266f4d7b names the cause, "published as its dist/ output (main: ./dist/index.js)", and still fixes the call site, by copying the step from `deploy.yml`. The package shape made "add one more build step" the local fix each time.

## Detection failure causes

- **CI:** always green, because CI builds infra first. A CI that compensates for a missing step hides it from every other environment.
- **Harness:** the SessionStart banner reports what it installed. It said nothing about a build it never attempted.
- **Code review:** no diff was wrong. The defect lived in the difference between two bootstraps.

## Countermeasure

Commit `ebabfe7` made `scripts/install-repo-deps.sh` build `@borso/infra` right after `pnpm install`, unconditionally, and report a failure through `note_missing` in the SessionStart banner.

```diff
 log "running pnpm install"
 pnpm install --frozen-lockfile
+
+log "building @borso/infra (its dist is what app cdk typechecks resolve)"
+pnpm --filter @borso/infra run build ||
+  note_missing '@borso/infra dist' "..."
```

## Eradication

**Type:** DevX check (level 2)

**Reference:** commit [`ebabfe7`](https://github.com/hugoleborso/borso.fr/commit/ebabfe7) (PR #45), then e51cfdd5a (PR #173), which added `scripts/ensure-infra-built.sh`.

The bootstrap fix did not hold for the class. A subagent worktree never runs SessionStart, so it hit the same TS2307 (`the-worktree-that-could-not-see-its-own-infra`). What holds today is `scripts/ensure-infra-built.sh`, which every app's `typecheck` and `synth` script and `scripts/lint-workspace.sh` call first. It builds `@borso/infra` when `dist/` is missing or older than `src/`.

The entry point that gates a typecheck repairs the missing build itself. A typecheck run through `pnpm typecheck` can no longer fail on a missing `dist/`. A bare `tsc` run outside those scripts still can.

**Proof it can fail:** not rerun this session. `the-worktree-that-could-not-see-its-own-infra` records the before and after.

**Proposed:** point the type entry of `@borso/infra` at its source, through a `types` condition on `./src/index.ts` or a custom condition set in the consuming tsconfigs. A typecheck would then read source and need no build at all. That deletes the build from every typecheck path (the bootstrap, `ci.yml`, `ensure-infra-built.sh` in each app's `typecheck`), and it removes the stale-dist hazard of `shared-deploy-stale-dist` for typechecking. Runtime is not covered. `build` copies `.code.js` and `.mjs` files into `dist/`, and a deploy reads them from there (inferred from the `build` script in `infra/cdk/package.json`).

**Similar instances:** `git grep -l "filter @borso/infra\|ensure-infra-built" -- .github/workflows scripts 'apps/*/package.json'` lists every place that still builds infra before reading it. The worktree case and the stale dist (`shared-deploy-stale-dist`) share this cause.
