---
date: 2026-08-08
introduced-at: conception
detected-at: gate-failure
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-commits: []
eradication-level: 1
time-to-detect: months
tags: [cdk, vitest, disk, sandbox, gates, ci]
---

# Every CDK test run left a cloud assembly on disk, and the disk ran out

## Symptom

`git push` failed on the pre-push hook. Three infra suites had failed:

```
Error: ENOSPC: no space left on device, copyfile
  'node_modules/.pnpm/@aws-cdk+asset-awscli-v1@2.2.273/.../layer.zip'
  -> '/tmp/cdk.outfAHVA9/asset.e2659170….zip'
```

Nothing in the diff touched `infra/`. The same suites had passed twice in the
preceding twenty minutes.

`df` showed 1.8 MB available on a 252 GB filesystem. `/tmp` held **905**
directories named `cdk.out*`, together about 28 GB.

## Root-cause chain

1. `new App()` without an explicit `outdir` writes its cloud assembly to a fresh
   `fs.mkdtemp` directory under the system temp folder.
2. CDK never removes it. There is no `App.dispose()`, and the assembly is
   deliberately left behind so a real `cdk synth` can be inspected.
3. `infra/cdk`'s unit suite constructs an `App` per test case. One
   `test:coverage` run creates **50** of them.
4. Each assembly stages real assets. The awscli Lambda layer that
   `BucketDeployment` needs is 25 MB, copied into every assembly that contains a
   static site.
5. Four workspaces synthesize CDK in their test suites — `infra/cdk`,
   `infra/shared`, `apps/pragma`, `apps/last-loop-lepin` — and the pre-push hook
   runs two of them on every push.
6. This session ran the suites dozens of times. 905 directories accumulated, the
   sandbox's fixed disk allowance was exhausted, and the failure surfaced inside
   a test that had nothing to do with the cause.

## Detection failure causes

- **The cleanup existed, but only at session start.** `scripts/install-repo-deps.sh`
  sweeps `/tmp/cdk.out*` from the SessionStart hook. That covers a fresh session
  and does nothing for a long one, which is exactly the session shape where the
  leak matters. A countermeasure that runs once per session cannot hold against
  a leak that is per test run.
- **`ENOSPC` names the victim, not the cause.** The error points at
  `infra/cdk`'s asset staging, so the first instinct is to look at what changed
  in `infra/`. Nothing had. Reading `df` before reading the diff would have been
  quicker.
- **A full disk reads as a broken machine.** On this sandbox "Avail" reaches 0
  while "Used" stays low, because the allowance is spent rather than the volume
  filled. That looks like an environment fault rather than something a `rm`
  fixes.

## Countermeasure

A vitest `globalSetup` at `scripts/vitest-cdk-outdir-teardown.js`, wired into
every workspace whose tests synthesize a CDK `App`:

- `infra/cdk/vitest.config.ts`
- `infra/shared/vitest.config.ts`
- `apps/pragma/vitest.workspace.ts`, the `core` project
- `apps/last-loop-lepin/vitest.workspace.ts`, the `core` project

It lists `cdk.out*` in the temp folder before the run, lists them again at
teardown, and removes the difference. Differencing rather than globbing means a
concurrently running suite keeps its own directories, which matters because the
pre-push hook and an editor's test watcher can overlap.

Measured: `infra/cdk`'s `test:coverage` left 50 directories before the change.
After wiring the teardown, all four suites leave zero — checked by clearing the
temp folder, running each suite, and counting. The other three suites'
before-counts were not measured, because the fix was already in place by then.

## Eradication

**Level 1 — structural.** The leak is closed where it happens rather than swept
up later. The SessionStart sweep stays as a second line for directories left by
an interrupted run, but it is no longer the only thing standing between the
repository and a full disk.

## What to check next time

A test that stages CDK assets writes tens of megabytes per case. If a suite
constructs an `App` and the config has no `globalSetup` pointing at
`scripts/vitest-cdk-outdir-teardown.js`, it leaks. When adding a new workspace
with CDK tests, wire the teardown at the same time as the config.

More generally: when a gate fails on an error that names a file rather than a
behaviour — `ENOSPC`, `EMFILE`, `ENOMEM` — check the resource before checking
the diff.
