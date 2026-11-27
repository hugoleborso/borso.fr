---
date: 2026-10-02
introduced-at: implementation
detected-at: ci
severity: medium
related-pr: '#110'
fix-commits: [3d7adaa065, 9dcf74547]
eradication-level: 5
eradication-paths: []
time-to-detect: days
tags: [ci, eslint, gates, banana-rush]
zone: .github/workflows/ci.yml
---

# Five apps did not fit in one lint heap

## User impact

From PR #110 onwards, every push to `main` ended with a red `build` job, so `main` could not be trusted as green.

| | Seen | Expected |
| --- | --- | --- |
| Four consecutive runs on `main`, and the PR #119 kaizen branch | `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory`, then `Command was killed with SIGABRT (Aborted): eslint . --max-warnings 0 --cache …` | The lint step reports rule violations or passes |

## Causal chain

- The `build` job on `main` aborted with an out-of-memory error.
  - ESLint reached Node's default heap limit of about 4 GB on the runner.
    - typescript-eslint builds a TypeScript program for each tsconfig it meets before any rule runs. `eslint .` met every workspace's tsconfigs and kept all their programs alive in one process until it exited.
      - PR #110 added banana-rush, the fifth application, with three tsconfigs of its own. The sum crossed the limit, while each workspace alone stayed under it. pragma, the largest, linted in 73 s under the same 4 GB.
        - The faulty line, in `.github/workflows/ci.yml`:

          ```yaml
          - run: pnpm exec eslint . --max-warnings 0 --cache --cache-strategy content --cache-location .eslintcache
          ```

          - Commit `314f24821` (2026-08-08, "replace biome with eslint and prettier", written by an agent) introduced one `eslint .` over the whole repository. Four applications fitted then.
  - Branch for the merge. PR #110's own `ci` runs were green on the branch (run 35540614177 among them). The likeliest difference is the ESLint cache. A pull-request run restored a warm one that spared the type-aware pass most files, while the run on `main` started from a different key (inferred, not verified). What is verified is that a cold whole-repository run exhausts a 4 GB heap.

## Root cause of occurrence

*Thought one `eslint .` grows with the repository linearly and harmlessly, actually its memory is the sum of every workspace's TypeScript program, so each new application moves it toward a fixed ceiling.* (Material)

The agent that wrote the line in `314f24821` replaced Biome, which builds no TypeScript program. Nothing in its brief carried typescript-eslint's cost model, in which each tsconfig adds a program held in memory (inferred from the commit, whose message weighs rules and speed and never memory).

## Detection failure causes

- **Local:** pre-commit linted staged files only, so no local command ran the whole repository in one process.
- **CI on the pull request:** a warm cache hid the cold-run cost, if the explanation above holds, so a green pull-request run said little about `main`'s.
- **CI on `main`:** it detected the failure four times. A red run on `main` blocks no later merge, because each pull request is gated on its own checks, so later pull requests merged on top (inferred).

## Countermeasure

Commit `3d7adaa` replaced the single run with `scripts/lint-repository.sh`, one ESLint process per directory under `apps/` and `infra/`, then one for everything else. Each process freed its programs on exit, so the peak was the largest workspace rather than the sum. Reproduced locally with `--max-old-space-size=4096`: `eslint .` died at 215 s, the split passed cold in 190 s.

Raising the heap was rejected. It moves the ceiling by an amount that depends on the runner's memory, which nothing in this repository can see.

## Eradication

**Type:** none holds today (level 5 in the front matter). The level 1 split shipped for ESLint and was replaced on 2026-10-27.

**Reference:** commit `3d7adaa` (the split), then commit `9dcf74547` (PR #197), which replaced ESLint with oxlint.

```diff
-      - run: pnpm exec eslint . --max-warnings 0 --cache --cache-strategy content --cache-location .eslintcache
+      - run: scripts/lint-repository.sh
```

The split held until PR #197. Since then `scripts/lint-repository.sh` runs one process, `oxlint --type-aware .`, over the whole repository, and tsgolint builds each tsconfig's program with the TypeScript 7 compiler ([ADR 2026-10-27T2320](../adr/2026-10-27T2320-oxlint-and-oxfmt-replace-eslint-and-prettier.md)). The pre-commit sibling, `scripts/lint-changed-files.sh`, is deleted, and staged files go to `scripts/lint-staged-files.sh`. The property the split held, a peak bounded by the largest workspace, went with it. No measurement of tsgolint's peak memory against the runner is recorded, so the margin is unknown. Today one process again holds every workspace, and no check, alarm or triggered knowledge entry bounds its memory.

**Proposed:** wrap the lint step in CI with `/usr/bin/time -v`, read its maximum resident set size, and fail above a budget computed from the runner's memory. A new application would then fail at a named number, with the margin visible in every run, instead of aborting with a heap error.

**Similar instances:** `grep -rn 'bin/oxlint\|exec oxlint' scripts/*.sh .husky/` finds four type-aware runs. `scripts/lint-repository.sh` (CI) holds the whole repository in one process. `scripts/lint-staged-files.sh` (pre-commit) and `.husky/pre-push` hold every workspace the change touches. `scripts/lint-workspace.sh` holds one workspace.
