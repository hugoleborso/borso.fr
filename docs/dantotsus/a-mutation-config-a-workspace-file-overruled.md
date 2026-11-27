---
date: 2026-08-08
introduced-at: conception
detected-at: local
severity: high
related-pr: '#40'
fix-commits: [11d9c490d1, f1c25506e, c54e32da7]
eradication-level: 1
eradication-paths: [apps/pragma/vitest.mutation.config.ts, apps/last-loop-lepin/vitest.mutation.config.ts, stryker-zero-test-guard.js, .github/workflows/ci.yml]
time-to-detect: one branch
tags: [vitest, stryker, mutation, gates, testing, workspaces]
zone: apps/pragma/vitest.mutation.config.ts
weak-point: gate-measures-nothing
recurs: [a-gate-that-reported-success-while-measuring-nothing]
---

# The mutation gate on the two full-stack apps could never have run

## User impact

The mutation gate on pragma and last-loop-lepin, the two full-stack apps of
the time, never tested a single mutant. Every push that "passed" it measured
nothing on those apps.

| | Seen | Expected |
| --- | --- | --- |
| `pnpm --filter @borso-app/pragma run test:mutation` | `Error: Failed to load url .../apps/pragma/scripts/vitest-cdk-outdir-teardown.js` then `ERROR Stryker Something went wrong in the initial test run` | a mutation score over the pure suites |
| `pnpm exec vitest run --config vitest.mutation.config.ts` | `Tests  no tests`, then `pragma back-e2e: DATABASE_URL must be set.` | the pure suites run, no Postgres |

## Causal chain

- Stryker aborted in its dry run on a path no config names.
  - The run executed the `core` project, whose `globalSetup` is `../../scripts/vitest-cdk-outdir-teardown.js`. Stryker runs in `.stryker-tmp/sandbox-<n>/`, two levels below the app, so the path resolved to `apps/pragma/scripts/`, which does not exist. `back-e2e` would have failed next, on its missing `DATABASE_URL`.
    - Vitest ran the projects of `vitest.workspace.ts`, not the config Stryker named. Vitest 2's `getWorkspaceConfigPath()` reads `config.workspace` when set, and otherwise scans the config file's directory for `vitest.workspace.{ts,js,json}` and runs its projects. The named config kept only its `resolve.alias`.
      - `vitest.mutation.config.ts` declared its `include` beside an existing `vitest.workspace.ts`.

        ```ts
        /**
         * Stryker runs against this config rather than the workspace file, so a
         * mutation run executes only the pure suites. ...
         */
        export default defineConfig({
          test: {
            environment: 'jsdom',
            include: ['api/src/**/*.core.test.ts', /* three more pure globs */], // ❌ discarded: the sibling workspace file wins
          },
        });
        ```

        - Commit `14fc404a6` (2026-08-08, an agent) wrote both full-stack mutation configs, wired them into `stryker.shared.js` and introduced the gate, in one commit. `vitest.workspace.ts` already sat in each app folder (`git show 14fc404a6^:apps/pragma/vitest.workspace.ts`). (Machine)

## Root cause of occurrence

*Thought the config passed to `--config` decides which tests run, actually
vitest 2 scans that config's folder for a workspace file and lets its projects
overrule the config's `include`, `environment` and `globalSetup`.*

The config's own comment states the belief: "Stryker runs against this config
rather than the workspace file, so a mutation run executes only the pure
suites."

Machine. The tool overrules the named file in silence. Vitest reports neither
the discovery of a workspace file nor the discarded `include`, so the config
reads as authoritative to anyone who reads it. `test.workspace` was the only
key that stopped the scan. The two front-end apps, which have no workspace
file, reached 100% with the same mechanism, which read as proof it worked.

## Detection failure causes

- **Pre-push:** `.husky/pre-push` ran `test:mutation` only for apps whose `*.core.ts` or `*.utils.ts` changed, and honoured `SKIP_MUTATION_GATE=1`. The variable was set for work-in-progress pushes on this branch, so the failure never surfaced.
- **The two front-end apps:** `borso-fr` and `borsouvertures` ship no `vitest.workspace.ts`, so their mutation config is the config. Their 100% scores were taken as proof the mechanism worked.
- **Review:** the config was read, never run. Vitest's silence made the read look right. Same shape as `per-file-coverage-gate-was-never-armed.md`.

## Countermeasure

`11d9c490d` made each full-stack mutation config name a workspace explicitly
(`test.workspace`), with a sibling `vitest.mutation.workspace.ts` holding the
one `pure` project. Verified on both apps: pragma ran 556 pure tests and
last-loop-lepin 641, against zero before, and neither touched Postgres or the
CDK snapshots.

## Eradication

**Type:** structural impossibility (level 1), with detection behind it.

**Reference:** commits [`f1c25506e`](https://github.com/hugoleborso/borso.fr/commit/f1c25506e) and [`c54e32da7`](https://github.com/hugoleborso/borso.fr/commit/c54e32da7).

The `11d9c490d` workaround was itself replaced. `f1c25506e` moved every
workspace to vitest 4, which removes the separate workspace file in favour of
`test.projects`. The discovery rule is gone, so a sibling file can no longer
overrule a config. Both apps deleted `vitest.workspace.ts` and
`vitest.mutation.workspace.ts`, and each `vitest.mutation.config.ts` now
declares its `pure` project inline.

```diff
-export default defineConfig({
-  test: { workspace: fromHere('./vitest.mutation.workspace.ts') },
-});
+export default defineConfig({
+  test: {
+    projects: [{ test: { name: 'pure', include: [/* pure suites */] } }],
+  },
+});
```

Two detections now stand behind it. `c54e32da7` moved mutation testing from
pre-push to a `mutation` job in `ci.yml` that runs on every pull request, and
deleted `SKIP_MUTATION_GATE` (`grep -rn SKIP_MUTATION .husky scripts` finds
nothing). `stryker-zero-test-guard.js`, a reporter `stryker.shared.js` loads,
fails a run where a covered mutant ran no tests.

**Proof it can fail:** `ls apps/*/vitest*.workspace.ts` finds no file, and
vitest 4 no longer reads one. The zero-test guard was not planted in this
rewrite.

**Similar instances:** `ls apps/*/vitest.mutation.config.ts` lists six apps.
Each declares its projects inline.
