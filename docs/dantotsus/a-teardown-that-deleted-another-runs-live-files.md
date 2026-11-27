---
date: 2026-08-09
introduced-at: implementation
detected-at: local
severity: high
related-pr: '#40'
fix-commits: [64d0ce43b9]
eradication-level: 1
eradication-paths: [scripts/vitest-cdk-outdir-teardown.js]
time-to-detect: one push
tags: [vitest, cdk, concurrency, temp-files, hooks]
zone: scripts/vitest-cdk-outdir-teardown.js
recurs: [cdk-tests-leak-a-temp-assembly-per-synth]
---

# A teardown deleted another run's live files, and its docstring said it would not

## User impact

The first push after `.husky/pre-push` started running its gates in parallel
failed in `infra/cdk`, on a suite that had passed on its own minutes earlier:

```
Error: ENOENT: no such file or directory, copyfile
  '.../@aws-cdk/asset-awscli-v1/lib/layer.zip'
  -> '/tmp/cdk.outK8VKKe/asset.e2659170….zip'
Error: ENOENT: no such file or directory, mkdir
  '/tmp/cdk.outLJ744i/asset.fffc495e…'
 Test Files  2 failed | 19 passed (21)
      Tests  206 passed (206)
```

| | Seen | Expected |
| --- | --- | --- |
| Gates run in parallel on a push | two CDK test files fail with `ENOENT`, every test passes | every suite passes, as each does alone |

## Causal chain

- Two CDK test files failed with `ENOENT` while writing their cloud
  assemblies.
  - Their `/tmp/cdk.out*` directories were deleted while they synthesized.
    - Another gate's teardown, finishing first, deleted them. Six of the
      seven parallel gates share `scripts/vitest-cdk-outdir-teardown.js` as
      their `globalSetup`.
      - The teardown listed `/tmp/cdk.out*` at setup and again at teardown,
        and deleted the difference. Every directory created in that window
        counted as its own, including those of the runs beside it.
        - Commit f4f14f2ff (2026-08-08, an agent session) wrote it, and its
          docstring claimed the opposite: directories "identified by
          differencing the temp folder rather than by age, so a suite running
          concurrently keeps its own".
          - The commit verified the script "by clearing the temp folder and
            counting after each suite", one suite at a time. No run put two
            suites in the same window. **Man.**

## Root cause of occurrence

*Thought differencing the temp folder gives each run ownership of the
directories it created, actually it gives a run every directory created while
it ran, so under concurrency it claims and deletes its neighbours'.* **Man:**
the agent reasoned about concurrency in its commit message, chose
differencing because of it, and verified only the sequential case.

f4f14f2ff's message: "Differencing rather than globbing matters because the
pre-push hook and an editor's watcher can overlap, and a blanket
`rm /tmp/cdk.out*` would delete the other run's assemblies mid-synth."

## Detection failure causes

- **Local validation:** every run of the script before this push was
  sequential, where the difference is exactly right.
- **Review:** the docstring asserted the property that was missing. A reader
  checking for concurrency safety found the reassurance and stopped.
- **The failure's shape:** `ENOENT` inside CDK asset staging reads as a
  broken checkout or dependency. The first guess was CPU contention, because
  the push had just started seven jobs on four cores. The tell was
  `Tests 206 passed` beside `Test Files 2 failed`: the failure was in file
  I/O around the tests.

## Countermeasure

Each run makes its own temp root, points `TMPDIR` at it, and deletes exactly
that root:

```js
export async function setup() {
  const runTempRoot = await mkdtemp(join(tmpdir(), RUN_TEMP_PREFIX));
  process.env.TMPDIR = runTempRoot;
  return async function teardown() {
    await rm(runTempRoot, { recursive: true, force: true });
  };
}
```

`os.tmpdir()` re-reads `TMPDIR` on every call. Vitest spawns its workers
after `globalSetup` returns, and they inherit the environment, so every
`mkdtemp` in the run, including CDK's inside asset staging, lands in that
run's root.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit [`64d0ce43b`](https://github.com/hugoleborso/borso.fr/commit/64d0ce43b9).

A run can no longer name another run's directory. It removes only the path
it created. No shared namespace is left to race over. The script still has
this shape today (`scripts/vitest-cdk-outdir-teardown.js:9`).

**Proof it can fail:** the shape that broke the push, four CDK-synthesizing
suites at once on the four-core box, measured when the fix landed:

```
infra    exit=0 | Tests  239 passed (239)
shared   exit=0 | Tests   36 passed (36)
pragma   exit=0 | Tests  669 passed (669)
lll      exit=0 | Tests  730 passed (730)
after: cdk.out dirs=0   vitest-cdk roots left=0
```

Nothing failed, and nothing leaked. The leak was the half worth checking,
because the script exists to stop a sandbox filling its disk.

**Similar instances:** `grep -rn "readdirSync(tmpdir\|cdk.out\*" scripts apps/*/vitest.config.ts infra`
finds one other cleanup, `scripts/install-repo-deps.sh:221`, which removes
every `/tmp/cdk.out*` at SessionStart. It runs before the session's first
suite, and a suite run through the shared `globalSetup` now writes under its
own `vitest-cdk-*` root, so that sweep reaches only assemblies left by runs
outside it (inferred from the two scripts).
