---
date: 2026-11-03
introduced-at: implementation
detected-at: local
severity: low
related-pr: '#251'
fix-pr: none (the kaizen pull request of PR #251, not opened when this was written)
fix-commits: [self]
eradication-level: 1
eradication-paths: [apps/pragma/vitest.config.ts, apps/banana-rush/vitest.config.ts, apps/borso-fr/vitest.config.ts, apps/borsouvertures/vitest.config.ts, apps/last-loop-lepin/vitest.config.ts, apps/talos/vitest.config.ts, infra/cdk/vitest.config.ts, infra/shared/vitest.config.ts, vitest.config.ts]
time-to-detect: minutes
tags: [vitest, concurrency, temp-files, agents, testing]
zone: apps/pragma/vitest.config.ts
recurs: [a-teardown-that-deleted-another-runs-live-files]
---

# Two coverage runs in one app shared one scratch folder, and the second one died

## User impact

The technical validator of PR #251 could not run the coverage gate it is told
to run. It found a workaround and logged the friction.

| | Seen | Expected |
| --- | --- | --- |
| `vitest run --project core --changed e6b644dd --coverage` in `apps/pragma` | `ENOENT … coverage/.tmp/coverage-27.json`, exit 1, no coverage verdict | the per-file coverage verdict |
| The validator's note | "likely a parallel run sharing the default directory" | a probed cause |

## Causal chain

- The validator's coverage run failed with `ENOENT` on a file it had just written.
  - Another Vitest run started in `apps/pragma` while it ran.
    - Each run's coverage provider starts with `clean`, which deletes
      `<reportsDirectory>/.tmp` and recreates it.
      - Every config left `coverage.reportsDirectory` at its default,
        `./coverage`, so every run in one workspace shared one `.tmp`.

Vitest names this itself. Its v8 provider rewrites the `ENOENT` as *"Something
removed the coverage directory … Make sure you are not running multiple Vitests
with the same `coverage.reportsDirectory` at the same time"*
(`vitest/dist/chunks/coverage.*.js`, `normalizeCoverageFileError`).

Reproduced (measured, 2026-11-03): two
`vitest run --project core --coverage site/src/components/organisms` in
`apps/pragma`, started 3 s apart. The second ended with
`ENOENT: … coverage/.tmp/coverage-48.json` and never printed a threshold line.

## Root cause of occurrence

*Thought a test run owns its output folder, actually every run of one
workspace writes into the same `coverage/`.*

The repository already learned this once for CDK's temp folders, in
[a teardown that deleted another run's live files](./a-teardown-that-deleted-another-runs-live-files.md).
That fix gave each run its own temp root, but only for the folders CDK makes.
The coverage folder is computed from the config, not from `TMPDIR`, so it
stayed shared.

## Detection failure causes

- **Pre-push:** runs one Vitest per workspace, so its own gates never meet in
  one `coverage/`. The collision needs a second process in the same workspace,
  which only parallel agents, or an agent beside the operator, produce.
- **CI:** one job per workspace, never two runs in one checkout.

## Countermeasure

Every config that measures coverage gives each run its own folder under the
system temp folder:

```ts
reportsDirectory: join(tmpdir(), 'vitest-coverage', String(process.pid)),
```

The config is evaluated in Vitest's main process before any `globalSetup`, so
`tmpdir()` reads the real temp folder, not the per-run root
`vitest-cdk-outdir-teardown.js` sets later.

**Property dropped.** The HTML, lcov and clover reports no longer land at a
stable `coverage/index.html`. Nothing in `.github/`, `.husky/` or `scripts/`
reads them (checked with `git grep`), and each run's report is 6.9 MB in
`apps/pragma` (measured), so a per-run folder inside the repository would pile
up. The reports now live in the temp folder until the system clears it.

Verified with the same two concurrent runs after the change. Both printed the
per-file threshold report (898 threshold lines each), and neither printed
`ENOENT`. Before the change the second run printed 0 threshold lines.

## Eradication

**Type:** structural impossibility (level 1)

**Reference:** commit `[self]` on the kaizen branch of PR #251

```diff
+import { tmpdir } from 'node:os';
+import { join } from 'node:path';
 …
     coverage: {
       provider: 'v8',
+      reportsDirectory: join(tmpdir(), 'vitest-coverage', String(process.pid)),
```

Two runs no longer share a folder to delete, in any of the nine configs. The
same class for CDK's temp folders is
[a teardown that deleted another run's live files](./a-teardown-that-deleted-another-runs-live-files.md).
The validator's guess was right this time, and only the probe made it a fact
([a validator can name a cause it never probed](../knowledge/a-validator-can-name-a-cause-it-never-probed.md)).

Refusal of the old shape, pasted from the reproduction before the change:

```
Caused by: Error: ENOENT: no such file or directory, open '/home/user/borso.fr/apps/pragma/coverage/.tmp/coverage-48.json'
exit 1
```
