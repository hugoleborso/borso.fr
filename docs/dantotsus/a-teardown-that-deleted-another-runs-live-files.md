---
date: 2026-08-09
introduced-at: parallelisation
detected-at: the-first-parallel-push
severity: high
related-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-pr: https://github.com/hugoleborso/borso.fr/pull/40
fix-commits: []
eradication-level: 1
time-to-detect: one push
tags: [vitest, cdk, concurrency, temp-files, hooks]
---

# A teardown deleted another run's live files, and its docstring said it would not

## Symptom

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

Every individual test passed. Two files failed while *writing* to a directory
that existed a moment earlier.

## Root-cause chain

1. **Six of the seven parallel gates share one `globalSetup`.** `infra/cdk`,
   `infra/shared` and the `core` project of both full-stack apps all use
   `scripts/vitest-cdk-outdir-teardown.js`, which exists because `new App()`
   without an `outdir` leaves a 25 MB cloud assembly under the system temp
   folder and never removes it.
2. **It identified "its own" directories by differencing the temp folder.** It
   listed `/tmp/cdk.out*` at setup, listed again at teardown, and deleted the
   difference.
3. **Differencing cannot express ownership under concurrency.** Anything that
   appears between one run's start and its finish is attributed to that run —
   including the directories another run created in the same window. The first
   gate to finish therefore deleted the live assemblies of every gate still
   synthesizing.
4. **Nothing was wrong until the gates ran at once.** Sequentially the diff is
   exactly right, and it had been right for as long as anything had run it.

## Detection failure causes

- **The docstring asserted the property that was missing.** It said the run
  removed its directories *"identified by differencing the temp folder rather
  than by age, so a suite running concurrently keeps its own"*. That sentence
  is the defect stated as a feature. A reader checking whether the script was
  concurrency-safe would have found the reassurance and stopped.
- **The failure surfaced far from its cause.** `ENOENT` inside CDK's asset
  staging reads as a broken checkout or a bad dependency, not as another process
  deleting files. The first instinct was CPU contention, because the same push
  had just started seven jobs on four cores.
- **Individual tests all passed.** `Tests 206 passed` beside `Test Files 2
  failed` is an unusual shape, and it is the tell: the failure was in file I/O
  around the tests, not in an assertion.

## Countermeasure

Ownership is now real rather than inferred. Each run makes its own temp root and
deletes exactly that:

```js
export async function setup() {
  const runTempRoot = await mkdtemp(join(tmpdir(), RUN_TEMP_PREFIX));
  process.env.TMPDIR = runTempRoot;
  return async function teardown() {
    await rm(runTempRoot, { recursive: true, force: true });
  };
}
```

Redirecting `TMPDIR` is what makes it real: `os.tmpdir()` re-reads the variable
on every call, Vitest spawns its workers after `globalSetup` returns, and they
inherit the environment — so every `mkdtemp` in the run lands inside that run's
root, including the ones CDK makes deep inside asset staging.

## Eradication

**Level 1 — structural.** A run can no longer name, let alone delete, another
run's directory: it only ever removes a path it created itself. There is no
shared namespace left to race over.

Verified by reproducing the exact shape that broke the push — four
CDK-synthesizing suites at once, on the four-core box that failed:

```
infra    exit=0 | Tests  239 passed (239)
shared   exit=0 | Tests   36 passed (36)
pragma   exit=0 | Tests  669 passed (669)
lll      exit=0 | Tests  730 passed (730)
after: cdk.out dirs=0   vitest-cdk roots left=0
```

Both properties at once: nothing failed, and nothing leaked. The leak is the
half worth re-checking, because the original script existed to stop a sandbox
filling its disk, and an isolation fix that forgot to clean up would have traded
one `ENOSPC` for another.

## What to check next time

When a comment claims a property, that claim is a hypothesis, not evidence —
and a claim about concurrency written by someone who only ever ran the thing
sequentially is worth less than no claim at all. Prefer isolation to
attribution: a process that only deletes paths it created needs no reasoning
about who owns what.

The shape to recognise: **every test passing while test *files* fail** points at
the filesystem or the environment around the run, not at the code under test.
