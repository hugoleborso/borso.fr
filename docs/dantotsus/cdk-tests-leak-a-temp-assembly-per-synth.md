---
date: 2026-08-08
introduced-at: conception
detected-at: local
severity: high
related-pr: '#40'
fix-commits: [f4f14f2ff5, 64d0ce43b]
eradication-level: 5
eradication-paths: [scripts/vitest-cdk-outdir-teardown.js, infra/cdk/vitest.config.ts]
time-to-detect: months
tags: [cdk, vitest, disk, sandbox, gates, ci]
zone: infra/cdk/test/unit
blueprints: [test-cdk-synth]
---

# A push failed on a full disk that 905 forgotten test assemblies had filled

## User impact

An agent could not push. The pre-push hook failed three infra suites, although the diff touched nothing in `infra/`, and the same suites had passed twice in the previous twenty minutes.

| | Seen | Expected |
| --- | --- | --- |
| `git push` | `Error: ENOSPC: no space left on device, copyfile '.../layer.zip' -> '/tmp/cdk.outfAHVA9/asset.e2659170….zip'` | The hook passes, as it did twenty minutes earlier. |
| `df` | 1.8 MB available on a 252 GB filesystem | Gigabytes free |
| `/tmp` | 905 directories named `cdk.out*`, about 28 GB | None left after a run |

Measured by the session that hit it.

## Causal chain

- The pre-push suites failed with `ENOSPC`.
  - The sandbox's disk allowance was spent: 905 `cdk.out*` directories held about 28 GB in `/tmp`.
    - Each test synth wrote a cloud assembly to a fresh temporary directory, and nothing removed it. One `test:coverage` run of `infra/cdk` left 50.
      - Each assembly staged real assets, such as the 25 MB awscli layer `BucketDeployment` needs, in every assembly with a static site.
      - Every synth test created its `App` with no `outdir`:

        ```ts
        export function synthTemplate(setup: (stack: Stack) => void): Template {
          const app = new App(); // ← assembly goes to a new temp dir, never removed
        ```

        - The pattern came with the test suite ported in `1aa979e74` (2026-05-01) and was gathered into `synthTemplate` (`infra/cdk/test/unit/helpers/template.ts`). The `test-cdk-synth` blueprint (`infra/cdk/test/unit/photos-cdn.test.ts`) tells every construct test to synthesize through that helper (Machine).
    - The only cleanup, a sweep of `/tmp/cdk.out*` in `scripts/install-repo-deps.sh`, ran once at session start. This session ran the suites dozens of times.

## Root cause of occurrence

*Thought a test `App` synthesizes in memory and leaves nothing behind, actually without `outdir` CDK writes the assembly to a new temporary directory and never removes it.* (Machine)

No test author chose this. The line is written once in the shared helper, and the blueprint copies it into every construct test. The vendor doc steers away from the fix. The installed `aws-cdk-lib@2.276.0` `core/lib/app.d.ts` says of `outdir`:

> You should never need to set this value. … @default - If this value is _not_ set, considers the environment variable `CDK_OUTDIR`. If `CDK_OUTDIR` is not defined, uses a temp directory.

## Detection failure causes

- **Local validation and CI:** each run passes. The leak only shows as a sum over many runs, and CI starts from a fresh disk every time.
- **The session-start sweep:** it covers a fresh session and nothing within a long one, the very shape where the leak adds up.
- **The error:** `ENOSPC` names the asset copy that failed, in `infra/cdk`, not what filled the disk. It points at the diff.
- **The sandbox:** "Avail" reaches 0 while "Used" stays low, because an allowance is spent rather than the volume filled. It reads as a broken machine.

## Countermeasure

Commit `f4f14f2` added a vitest `globalSetup`, `scripts/vitest-cdk-outdir-teardown.js`. Commit `64d0ce43b` reshaped it. It now creates one temporary root per run, points `TMPDIR` at it, and deletes it at teardown, so a concurrent suite keeps its own files. Measured by the fix's author: `infra/cdk`'s `test:coverage` left 50 directories before and zero after.

## Eradication

**Type:** knowledge (level 5). The teardown closes the leak only where a config wires it.

**Reference:** commits [`f4f14f2`](https://github.com/hugoleborso/borso.fr/commit/f4f14f2ff5) and [`64d0ce4`](https://github.com/hugoleborso/borso.fr/commit/64d0ce43b).

Each workspace wires the teardown by hand. `grep -rln "vitest-cdk-outdir-teardown" --include=*.ts infra apps` finds eight configs today, every workspace that synthesizes CDK in its tests. Nothing wires a new workspace or refuses one that forgets. `scripts/check-app-registration.sh` does not read vitest configs. A new app with CDK tests and no `globalSetup` leaks again.

**Proposed:** give the helper the cleanup. Make `synthTemplate` create its `App` with an explicit `outdir` under one per-run directory, and remove that directory after the run, so a test that follows the blueprint cannot leak. Or move the `globalSetup` into one shared vitest base config that every workspace extends, so a new workspace inherits it. Either way, the eight hand-wired entries go.

**Proof it can fail:** none. No check refuses a config without the teardown.

**Similar instances:** `grep -rln "new App(" infra apps --include=*.test.ts` lists the tests that synthesize. Each must run under a wired config.
