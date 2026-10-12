---
date: 2026-08-20
introduced-at: stryker.shared.js
detected-at: pre-push gate
severity: medium
related-pr: https://github.com/hugoleborso/borso.fr/pull/76
fix-commit: n/a (two settings that must stay as they are)
time-to-detect: hours (both failures name something other than Stryker)
tags: [stryker, pnpm, mutation-testing, cdk, vendor-quirk]
summary: 'Stryker under pnpm must name its runner plugin and keep its sandbox outside the workspace; a `globalSetup` outside the workspace is absent from the sandbox.'
triggers:
  paths:
    - 'stryker.shared.js'
    - '**/stryker.config.js'
  output:
    - 'ERR_LOAD_URL'
    - 'No TestRunner plugin'
    - '\.stryker-tmp/sandbox'
---

# Stryker under pnpm: the sandbox must leave the workspace, and the plugin must be named

Two settings in `stryker.shared.js` look like preferences and are not. Both
were paid for.

## 1. `plugins` must name the runner explicitly

Stryker discovers plugins by globbing `node_modules/@stryker-mutator/*` from
its own install location. **pnpm's isolated store puts the runner behind a
symlink that the glob does not follow**, so the discovery finds nothing and
the run dies reporting no test runner.

Naming the plugin — `plugins: ['@stryker-mutator/vitest-runner']` — makes
Stryker `import()` it instead, which pnpm resolves normally. Removing the line
to "let it autodetect" reintroduces the failure.

## 2. `tempDirName` must point outside the workspace

Stryker copies the workspace into a sandbox per test runner. A sandbox that
appears and vanishes *inside* a workspace is visible to anything else walking
that directory, and it has bitten this repository twice:

- The architecture generator counted the sandbox's files as real ones. That
  symptom is recorded in
  [`the-architecture-page-counted-the-mutation-sandbox.md`](../dantotsus/the-architecture-page-counted-the-mutation-sandbox.md),
  whose countermeasure is a skip list in the generator.
- **`infra/cdk`'s CDK snapshot tests fail with an `ENOENT` inside
  `AssetStaging.calculateHash`** when a concurrent mutation run creates a
  sandbox mid-walk. The pre-push wave does exactly this every time a change
  touches both a pure module and anything else in the same workspace, so the
  failure reads as a flaky snapshot test and is not one.

The skip list fixes the first symptom only. Moving the sandbox out of the
workspace is what fixes the class, which is why `tempDirName` is computed
rather than left at its default.

### The sandbox path must be the real path

`tempDirName` is `realpathSync(tmpdir())` plus a slug, not `tmpdir()` alone. On
macOS `tmpdir()` returns `/var/folders/...`, a symlink to
`/private/var/folders/...`. Stryker hands Vitest the mutated file under the
first spelling, Vitest resolves its own module graph under the second, and
`vitest.related` compares the two as strings. It finds no related test, the dry
run is empty, and the run dies with *"No tests were executed"*. Linux has no
such symlink, which is why CI never saw it.

## Recognising each one

- *"No test runner"* / plugin not found, on a machine where the package is
  plainly installed → §1.
- `ENOENT` from `AssetStaging.calculateHash` in `infra/cdk`, only under the
  parallel pre-push wave, passing when the suite runs alone → §2.
- *"Vitest failed to find test files related to mutated files"* then *"No tests
  were executed"*, on macOS only, for a file whose test plainly imports it →
  the real path, §2.

## Stryker's sandbox breaks a Vitest `globalSetup` that lives outside the workspace

_Merged from `stryker-sandbox-and-plugin-resolution-under-pnpm.md` on 2026-10-10, when every entry gained a trigger._

Observed 2026-08-15 pointing Stryker at `infra/cdk` for the first time.

Every run died in the dry run:

```
Error: ERR_LOAD_URL Failed to load url
/home/user/borso.fr/infra/cdk/scripts/vitest-cdk-outdir-teardown.js
(resolved id: …). Does the file exist?
```

The file exists — at `<repo>/scripts/`, not at `<repo>/infra/cdk/scripts/`.
`infra/cdk/vitest.config.ts` names it as `'../../scripts/vitest-cdk-outdir-teardown.js'`.

**Why it breaks:** Stryker copies the workspace into `.stryker-tmp/sandbox-N/`
and runs from there. A `globalSetup` path that walks *up* out of the workspace
resolves against the sandbox, which contains only the workspace, so the file is
genuinely absent. The error names an absolute path that never existed, which
sends you looking for a missing file rather than a moved root.

**Fix:** give Stryker its own Vitest config with no out-of-workspace
`globalSetup`, via `vitest: { configFile: 'vitest.mutation.config.ts' }` — the
shape `apps/pragma` already uses for a different reason. The mutation run needs
only the pure suites, and those need no global setup.

Two other things in the same area, both real:

- `pnpm --filter <pkg> run test:mutation -- --mutate '<glob>'` fails with
  `error: too many arguments for 'run'`. pnpm forwards the `--` itself into
  Stryker's argv. Run the binary directly from the workspace instead:
  `cd apps/x && ../../node_modules/.bin/stryker run --mutate '<glob>'`.
- A killed Stryker run leaves `.stryker-tmp/sandbox-*` behind — a whole copy of
  the application. Any tool that walks `apps/` then reads every file twice and
  reports it confidently; the architecture generator read 501 files instead of
  249 that way, with every context appearing twice.

### See also

- [`docs/dantotsus/a-mutation-config-a-workspace-file-overruled.md`](../dantotsus/a-mutation-config-a-workspace-file-overruled.md)
- [`docs/dantotsus/a-sed-delimiter-disarmed-the-mutation-gate.md`](../dantotsus/a-sed-delimiter-disarmed-the-mutation-gate.md)
