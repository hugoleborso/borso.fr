---
date: 2026-08-08
introduced-at: conception
detected-at: first-real-run
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-commits: []
eradication-level: 1
time-to-detect: one branch
tags: [vitest, stryker, mutation, gates, testing, workspaces]
---

# The mutation gate on the two full-stack apps could never have run

## Symptom

`pnpm --filter @borso-app/pragma run test:mutation` never reached a single
mutant. Stryker aborted in its dry run:

```
Error: Failed to load url .../apps/pragma/scripts/vitest-cdk-outdir-teardown.js
ERROR Stryker Something went wrong in the initial test run
```

The path is nonsense — the file lives at the repository root, not under
`apps/pragma/` — and no configuration names it. `stryker.config.js` points at
`vitest.mutation.config.ts`, which declares four `include` globs over pure
suites and no setup file at all.

## Root-cause chain

1. **Vitest looks for a workspace file next to whichever config it is given,
   and lets that file win.** `getWorkspaceConfigPath()` reads
   `config.workspace` if set, and otherwise scans the *directory of the config
   file* for `vitest.workspace.{ts,js,json}`. Finding one, it runs that file's
   projects. The config Stryker named contributed its `resolve.alias` and
   nothing else — its `include` was discarded.
2. **So the mutation run was executing the workspace's two projects**, `core`
   and `back-e2e`. `core` carries the CDK snapshot suites and, since this
   branch, a `globalSetup` at `../../scripts/vitest-cdk-outdir-teardown.js`.
   Stryker runs inside `.stryker-tmp/sandbox-<n>/`, two levels below the app,
   so `../../scripts/` resolved to `apps/pragma/scripts/` — a directory that
   does not exist. `back-e2e` would have failed straight after, on the
   `DATABASE_URL` its setup demands.
3. **Nothing forced the config to be exercised before it was trusted.**
   `vitest.mutation.config.ts` was written, reviewed, committed and referenced
   from `stryker.shared.js` in the same commit that introduced the gate. The
   first time either full-stack app's mutation run was executed end to end was
   this one.

Confirming (2) independently, outside Stryker:

```
$ pnpm exec vitest run --config vitest.mutation.config.ts
   Tests  no tests
Unhandled Error: pragma back-e2e: DATABASE_URL must be set.
 ❯ Object.setup test/setup-postgres.ts:53:11
```

A config whose `include` names four globs of pure suites, running zero tests
and booting the Postgres project instead, is the whole defect in four lines.

## Detection failure causes

- **The gate is scoped to changed workspaces, and skipping it is one env var.**
  `.husky/pre-push` runs `test:mutation` only for apps whose `*.core.ts` or
  `*.utils.ts` changed, and honours `SKIP_MUTATION_GATE=1`. On a long branch
  that variable gets set for a work-in-progress push and the failure never
  surfaces. It was set on this one.
- **The two apps that did run were the two that could not hit this.**
  `borso-fr` and `borsouvertures` are front-end only and ship no
  `vitest.workspace.ts`, so their mutation config is the config. Both reached
  100%, which read as evidence that the mechanism worked.
- **A config file is not a run.** Same shape as
  `per-file-coverage-gate-was-never-armed.md`: the settings were verified by
  reading them. Vitest reports neither the discovery of a workspace file nor
  the discarding of the `include` it overrides.

## Countermeasure

`vitest.mutation.config.ts` in both full-stack apps now holds no test settings
at all. It names a workspace explicitly:

```ts
export default defineConfig({
  test: { workspace: fromHere('./vitest.mutation.workspace.ts') },
});
```

and the sibling `vitest.mutation.workspace.ts` declares the one `pure` project
the run is meant to execute. Setting `test.workspace` is the only thing that
stops the directory scan, so this is the mechanism rather than a workaround.

The settings had to move rather than be duplicated. A config that still
declared an `include` beside a workspace pointer would look load-bearing and be
inert, which is exactly the trap being removed.

## Eradication

**Level 1 — structural.** The path the gate takes is now the path that was
proven to work, on both apps:

```
$ cd apps/pragma && pnpm exec vitest run --config vitest.mutation.config.ts
 Test Files  59 passed (59)      Tests  556 passed (556)      [project: pure]

$ cd apps/last-loop-lepin && pnpm exec vitest run --config vitest.mutation.config.ts
 Test Files  53 passed (53)      Tests  641 passed (641)      [project: pure]
```

556 and 641 pure tests, against zero before. Neither run touches Postgres or
the CDK snapshots.

## What to check next time

Two properties, both cheap to check and both skipped here.

**A new gate is not shipped until it has been run once, red and green.** The
mutation gate was introduced, documented and wired into `pre-push` without a
single end-to-end execution on the apps it was written for.

**`SKIP_MUTATION_GATE=1` hides a broken gate exactly as well as it hides a
failing one.** When an escape hatch is used more than once on a branch, the
next push should clear it deliberately rather than let it ride, because a gate
that is always skipped and a gate that cannot run are indistinguishable from
the outside.

The specific trap: in Vitest, `--config` does not disable workspace discovery.
The scan runs against the config file's own directory, and the projects it
finds override the config's `test.include`, `test.environment` and
`test.globalSetup`. `test.workspace` is the only key that stops it.
